const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'background',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/backgrounds.json');
            const backgrounds = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Find exact and partial matches (case-insensitive)
            const exact = backgrounds.find(b => typeof b.name === 'string' && b.name.toLowerCase() === query);
            const partials = backgrounds.filter(b => typeof b.name === 'string' && b.name.toLowerCase().includes(query));
            if (!exact && partials.length > 1) {
                // Multiple partial matches, show select menu
                const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
                const options = partials.slice(0, 25).map(b => ({
                    label: b.name.slice(0, 100),
                    value: b.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('background_select')
                        .setPlaceholder('Select a background')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple backgrounds found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }
            const background = exact || partials[0];
            if (!background) {
                await interaction.editReply({ content: 'Background not found.', flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(background.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: background.description || '—', inline: false });
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching background information.`, flags: 64 }); } catch {}
        }
    }
};