const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'item',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const itemName = interaction.options.getString('name').trim().toLowerCase();
            const itemsDir = path.join(__dirname, '../data/items');
            const categories = [
                'adventuring-gear',
                'armor',
                'weapons',
                'wondrous-items',
                'potions',
                'rings',
                'rods',
                'scrolls',
                'staffs',
                'wands',
            ];

            let matches = [];
            for (const cat of categories) {
                const filePath = path.join(itemsDir, `${cat}.json`);
                if (!fs.existsSync(filePath)) continue;
                const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                matches = matches.concat(items.filter(i => i.name && i.name.toLowerCase().includes(itemName)));
            }

            if (matches.length === 0) {
                await interaction.editReply({ content: 'Item not found.', flags: 64 });
                return;
            }

            // If multiple matches, show a selector
            if (matches.length > 1) {
                const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
                const options = matches.slice(0, 25).map(i => ({
                    label: i.name.slice(0, 100),
                    value: i.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('item_select')
                        .setPlaceholder('Select an item')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple items found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }

            const foundItem = matches[0];
            let embed = new EmbedBuilder()
                .setTitle(foundItem.name)
                .setColor(0x5865F2)
                .setDescription(foundItem.description || '—');
            if (foundItem.rarity) embed.addFields({ name: 'Rarity', value: foundItem.rarity, inline: true });
            if (foundItem.type) embed.addFields({ name: 'Type', value: foundItem.type, inline: true });
            if (typeof foundItem.attuned !== 'undefined') embed.addFields({ name: 'Requires Attunement', value: foundItem.attuned ? 'Yes' : 'No', inline: true });
            if (foundItem.source) embed.addFields({ name: 'Source', value: foundItem.source, inline: false });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try {
                await interaction.editReply({ content: `Error fetching item information.`, flags: 64 });
            } catch {}
        }
    }
};