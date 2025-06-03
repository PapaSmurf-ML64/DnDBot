const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'spell',
    description: 'Look up a D&D spell and its details.',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/spells.json');
            const spells = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Find exact and partial matches
            const exactSpell = spells.find(s => s.name.toLowerCase() === query);
            const partialMatches = spells.filter(s => s.name.toLowerCase().includes(query));

            if (!exactSpell && partialMatches.length > 1) {
                // Limit to 25 options (Discord select menu limit)
                const options = partialMatches.slice(0, 25).map(s => ({
                    label: s.name.slice(0, 100),
                    value: s.name
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('spell_select')
                        .setPlaceholder('Select a spell')
                        .addOptions(options)
                );

                await interaction.editReply({
                    content: 'Multiple spells found. Please select one:',
                    components: [row],
                    flags: 64 // ephemeral
                });
                return;
            }

            // If only one match, or exact match, proceed as before
            const spell = exactSpell || partialMatches[0];
            if (!spell) {
                await interaction.editReply({ content: 'Spell not found.', flags: 64 });
                return;
            }

            // Build the embed
            let embed = new EmbedBuilder()
                .setTitle(spell.name)
                .setURL(spell.url) // Add this line to link the title to the spell's URL
                .setColor(0x5865F2)
                .addFields(
                    { name: 'Level', value: spell.level || '—', inline: true },
                    { name: 'School', value: spell.school || '—', inline: true },
                    { name: 'Casting Time', value: spell["Casting Time"] || '—', inline: true },
                    { name: 'Range', value: spell.Range || '—', inline: true },
                    { name: 'Components', value: spell.Components || '—', inline: true },
                    { name: 'Duration', value: spell.Duration || '—', inline: true },
                    { name: 'Description', value: spell.description || '—', inline: false }
                );
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try {
                await interaction.editReply({ content: `Error fetching spell information.`, flags: 64 });
            } catch {}
        }
    }
};