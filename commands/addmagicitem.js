const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'addmagicitem',
    data: new SlashCommandBuilder()
        .setName('addmagicitem')
        .setDescription('Add a homebrew magic item to the database')
        .addStringOption(opt => opt.setName('name').setDescription('Name of the magic item').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(true))
        .addStringOption(opt => opt.setName('rarity').setDescription('Rarity').setRequired(true)
            .addChoices(
                { name: 'Common', value: 'Common' },
                { name: 'Uncommon', value: 'Uncommon' },
                { name: 'Rare', value: 'Rare' },
                { name: 'Very Rare', value: 'Very Rare' },
                { name: 'Legendary', value: 'Legendary' },
                { name: 'Artifact', value: 'Artifact' },
                { name: 'Unique', value: 'Unique' },
                { name: '???', value: '???' }
            ))
        .addStringOption(opt => opt.setName('type').setDescription('Type').setRequired(true)
            .addChoices(
                { name: 'Weapon', value: 'Weapon' },
                { name: 'Armor', value: 'Armor' },
                { name: 'Ring', value: 'Ring' },
                { name: 'Wondrous Item', value: 'Wondrous Item' },
                { name: 'Potion', value: 'Potion' },
                { name: 'Rod', value: 'Rod' },
                { name: 'Scroll', value: 'Scroll' },
                { name: 'Staff', value: 'Staff' },
                { name: 'Wand', value: 'Wand' },
                { name: 'Other', value: 'Other' }
            ))
        .addStringOption(opt => opt.setName('attuned').setDescription('Requires attunement?').setRequired(true)
            .addChoices(
                { name: 'Yes', value: 'true' },
                { name: 'No', value: 'false' }
            )),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const name = interaction.options.getString('name');
            const description = interaction.options.getString('description');
            const rarity = interaction.options.getString('rarity');
            const type = interaction.options.getString('type');
            const attuned = interaction.options.getString('attuned') === 'true';
            const source = 'Homebrew';
            // No URL for homebrew

            const filePath = path.join(__dirname, '../data/magicitems.json');
            const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Check for duplicate name
            if (items.some(i => i.name && i.name.toLowerCase() === name.toLowerCase())) {
                await interaction.editReply({ content: 'A magic item with that name already exists.' });
                return;
            }

            const newItem = {
                name,
                description,
                rarity,
                type,
                attuned,
                source
            };
            items.push(newItem);
            fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
            await interaction.editReply({ content: `Magic item "${name}" added successfully!` });
        } catch (err) {
            try { await interaction.editReply({ content: 'Error adding magic item.' }); } catch {}
        }
    }
};
