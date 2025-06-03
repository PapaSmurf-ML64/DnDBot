const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'feat',
    description: 'Look up a D&D feat and its details.',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/feats.json');
            const feats = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Find partial and exact matches (case-insensitive)
            const partials = feats.filter(f => typeof f.name === 'string' && f.name.toLowerCase().includes(query));
            const exact = feats.find(f => typeof f.name === 'string' && f.name.toLowerCase() === query);
            if (partials.length > 1) {
                // Multiple partial matches, show select menu
                const options = partials.slice(0, 25).map(f => ({
                    label: f.name.slice(0, 100),
                    value: f.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('feat_select')
                        .setPlaceholder('Select a feat')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple feats found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }
            const feat = partials[0] || exact;
            if (!feat) {
                await interaction.editReply({ content: 'Feat not found.', flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(feat.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: feat.description || '—', inline: false });
            if (feat.url) embed.setURL(feat.url);
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching feat information.`, flags: 64 }); } catch {}
        }
    }
};