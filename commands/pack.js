const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pack')
        .setDescription('Look up an adventuring pack')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the pack')
                .setRequired(true)
        ),
    name: 'pack',
    description: 'Look up the contents of an adventuring pack.',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/packs.json');
            const packs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Find exact and partial matches (case-insensitive)
            const exact = packs.find(p => typeof p.name === 'string' && p.name.toLowerCase() === query);
            const partials = packs.filter(p => typeof p.name === 'string' && p.name.toLowerCase().includes(query));

            if (!exact && partials.length > 1) {
                // Multiple partial matches, show select menu
                const options = partials.slice(0, 25).map(p => ({
                    label: p.name.slice(0, 100),
                    value: p.name
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('pack_select')
                        .setPlaceholder('Select a pack')
                        .addOptions(options)
                );

                await interaction.editReply({
                    content: 'Multiple packs found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }

            const pack = exact || partials[0];
            if (!pack) {
                await interaction.editReply({ content: 'Pack not found.', flags: 64 });
                return;
            }

            // Split description into itemized list for 'Contents' field
            let description = pack.description || '—';
            let itemsList = [];
            // Improved splitting logic for clarity and maintainability
            let match = description.match(/includes? (.+)/i);
            if (match && match[1]) {
                let contents = match[1].replace(/\.$/, '');
                // Split by comma, ' and ', and handle 'The pack also has' more robustly
                let parts = contents.split(/, | and |\. The pack also has | The pack also has /i);
                itemsList = parts.map(s => s.trim().replace(/^and\s+/i, '')).filter(Boolean);
            } else {
                // fallback: just show description
                itemsList = [description];
            }

            const embed = new EmbedBuilder()
                .setTitle(pack.name)
                .setColor(0x5865F2);
            if (pack.cost) embed.addFields({ name: 'Cost', value: pack.cost, inline: true });
            if (itemsList.length > 0) {
                embed.addFields({ name: 'Contents', value: itemsList.map(i => `• ${i}`).join('\n'), inline: false });
            }
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching pack information.`, flags: 64 }); } catch {}
        }
    }
};