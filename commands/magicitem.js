const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Rarity color map
const rarityColors = {
    "common": 0xffffff,
    "uncommon": 0x1eff00,
    "rare": 0x0070dd,
    "very rare": 0xa335ee,
    "legendary": 0xff8000,
    "artifact": 0xfff569,
    "unique": 0xff69b4,
    "???": 0x808080
};

module.exports = {
    name: 'magicitem',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/magicitems.json');
            const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Find exact and partial matches
            const exact = items.find(i => typeof i.name === 'string' && i.name.toLowerCase() === query);
            const partials = items.filter(i => typeof i.name === 'string' && i.name.toLowerCase().includes(query));

            // Show selector if multiple partial matches and no exact match
            if (!exact && partials.length > 1) {
                const options = partials.slice(0, 25).map(i => ({
                    label: i.name.slice(0, 100),
                    value: i.name
                }));

                // Ensure all values are unique and non-empty
                const uniqueValues = new Set();
                const filteredOptions = [];
                for (const opt of options) {
                    if (opt.value && !uniqueValues.has(opt.value)) {
                        filteredOptions.push(opt);
                        uniqueValues.add(opt.value);
                    }
                }

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('magicitem_select')
                        .setPlaceholder('Select a magic item')
                        .addOptions(filteredOptions)
                );

                await interaction.editReply({
                    content: 'Multiple magic items found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }

            // Use the exact match or the first partial match
            const item = exact || partials[0];
            if (!item) {
                await interaction.editReply({ content: 'Magic item not found.', flags: 64 });
                return;
            }

            // Defensive defaults
            const itemName = typeof item.name === 'string' ? item.name : 'Unknown';
            const itemUrl = typeof item.url === 'string' ? item.url : null;
            const itemDescription = typeof item.description === 'string' && item.description.length > 0
                ? item.description.slice(0, 4096)
                : '—';
            const rarity = (typeof item.rarity === 'string' ? item.rarity : "???").toLowerCase();
            const color = rarityColors[rarity] ?? 0x5865F2;

            // Build the embed
            let embed = new EmbedBuilder()
                .setTitle(itemName)
                .setColor(color);

            if (itemUrl) embed.setURL(itemUrl);
            embed.setDescription(itemDescription);

            // Add fields for extra info
            if (item.rarity) embed.addFields({ name: 'Rarity', value: item.rarity, inline: true });
            if (item.type) embed.addFields({ name: 'Type', value: item.type, inline: true });
            if (typeof item.attuned !== 'undefined') embed.addFields({ name: 'Requires Attunement', value: item.attuned ? 'Yes' : 'No', inline: true });
            if (item.source) embed.addFields({ name: 'Source', value: item.source, inline: false });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching magic item information.`, flags: 64 }); } catch {}
        }
    }
};