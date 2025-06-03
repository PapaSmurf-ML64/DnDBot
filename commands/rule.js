const { JSDOM } = require('jsdom');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'rule',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const ruleName = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/rules.json');
            const rules = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Find exact and partial matches
            const exact = rules.find(r => r.name.toLowerCase() === ruleName);
            const partials = rules.filter(r => r.name.toLowerCase().includes(ruleName));

            if (!exact && partials.length > 1) {
                // Multiple partial matches, show select menu
                const options = partials.slice(0, 25).map(r => ({
                    label: r.name,
                    value: r.name
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('rule_select')
                        .setPlaceholder('Select a rule')
                        .addOptions(options)
                );

                await interaction.editReply({
                    content: 'Multiple rules found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }

            const rule = exact || partials[0];
            if (!rule) {
                await interaction.editReply({ content: 'Rule not found.', flags: 64 });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(rule.name)
                .setDescription(rule.description)
                .setColor(0x5865F2);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try {
                await interaction.editReply({ content: `Error fetching rule information.`, flags: 64 });
            } catch {}
        }
    }
};