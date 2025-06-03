const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'race',
    description: 'Look up a D&D race and its traits.',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/races.json');
            const races = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Find partial and exact matches (case-insensitive)
            const partials = races.filter(r => typeof r.name === 'string' && r.name.toLowerCase().includes(query));
            const exact = races.find(r => typeof r.name === 'string' && r.name.toLowerCase() === query);
            if (partials.length > 1) {
                // Multiple partial matches, show select menu
                const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
                const options = partials.slice(0, 25).map(r => ({
                    label: r.name.slice(0, 100),
                    value: r.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('race_select')
                        .setPlaceholder('Select a race')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple races found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }
            const race = partials[0] || exact;
            if (!race) {
                await interaction.editReply({ content: 'Race not found.', flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(race.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: race.description || '—', inline: false });
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching race information.`, flags: 64 }); } catch {}
        }
    }
};