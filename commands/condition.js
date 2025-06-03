const { JSDOM } = require('jsdom');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'condition',
    description: 'Look up a D&D condition and its effects.',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const conditionName = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/conditions.json');
            const conditions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Find exact and partial matches
            const exact = conditions.find(c => c.name.toLowerCase() === conditionName);
            const partials = conditions.filter(c => c.name.toLowerCase().includes(conditionName));

            if (!exact && partials.length > 1) {
                // Multiple partial matches, show select menu
                const options = partials.slice(0, 25).map(c => ({
                    label: c.name,
                    value: c.name
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('condition_select')
                        .setPlaceholder('Select a condition')
                        .addOptions(options)
                );

                await interaction.editReply({
                    content: 'Multiple conditions found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }

            const condition = exact || partials[0];
            if (!condition) {
                await interaction.editReply({ content: 'Condition not found.', flags: 64 });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(condition.name)
                .setDescription(condition.description)
                .setColor(0x5865F2);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try {
                await interaction.editReply({ content: `Error fetching condition information.`, flags: 64 });
            } catch {}
        }
    }
};