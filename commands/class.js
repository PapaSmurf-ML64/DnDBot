const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'class',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/classes.json');
            const classes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Find partial and exact matches (case-insensitive)
            const partials = classes.filter(c => typeof c.name === 'string' && c.name.toLowerCase().includes(query));
            const exact = classes.find(c => typeof c.name === 'string' && c.name.toLowerCase() === query);
            if (partials.length > 1) {
                // Multiple partial matches, show select menu
                const options = partials.slice(0, 25).map(c => ({
                    label: c.name.slice(0, 100),
                    value: c.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('class_select')
                        .setPlaceholder('Select a class')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple classes found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }
            const classObj = partials[0] || exact;
            if (!classObj) {
                await interaction.editReply({ content: 'Class not found.', flags: 64 });
                return;
            }
            // Show class info and, if subclasses exist, show a selector
            let embed = new EmbedBuilder()
                .setTitle(classObj.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: classObj.description || '—', inline: false });
            let components = [];
            if (Array.isArray(classObj.subclasses) && classObj.subclasses.length > 0) {
                // Only include subclasses that have a name and a url (skip malformed entries)
                const subclassOptions = classObj.subclasses.filter(s => s.name && s.url).slice(0, 25).map(s => ({
                    label: s.name.slice(0, 100),
                    value: `${classObj.name}|${s.name}|${s.url}` // composite value for uniqueness
                }));
                const subclassRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('subclass_select')
                        .setPlaceholder('Select a subclass')
                        .addOptions(subclassOptions)
                );
                components.push(subclassRow);
            }
            await interaction.editReply({ embeds: [embed], components });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching class information.`, flags: 64 }); } catch {}
        }
    }
};