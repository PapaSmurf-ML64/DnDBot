const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { JSDOM } = require('jsdom');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Dynamically load all commands from the commands folder for registration
const commandsPath = path.join(__dirname, 'commands');
const registrationFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const allCommands = [];
for (const file of registrationFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        allCommands.push(command.data.toJSON());
    } else if (command instanceof SlashCommandBuilder) {
        allCommands.push(command.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const GUILD_ID = process.env.GUILD_ID;
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: allCommands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// SINGLE interactionCreate HANDLER
client.on('interactionCreate', async interaction => {
    // --- SPELL COMMAND (spells.json only) ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'spell') {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, 'data/spells.json');
            const spells = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const exactSpell = spells.find(s => typeof s.name === 'string' && s.name.toLowerCase() === query);
            const partialMatches = spells.filter(s => typeof s.name === 'string' && s.name.toLowerCase().includes(query));
            if (!exactSpell && partialMatches.length > 1) {
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
            const spell = exactSpell || partialMatches[0];
            if (!spell) {
                await interaction.editReply({ content: 'Spell not found. If you selected from a menu and see this error, the menu may have expired. Please re-run the command.', flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(spell.name)
                .setURL(spell.url)
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
            console.error('SPELL ERROR:', err);
            try {
                await interaction.editReply({ content: `Error fetching spell information.`, flags: 64 });
            } catch {}
        }
        return;
    }

    // --- SPELL SELECT MENU HANDLER (spells.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'spell_select') {
        try {
            const selectedName = interaction.values[0];
            const filePath = path.join(__dirname, 'data/spells.json');
            const spells = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const spell = spells.find(s => s.name === selectedName);
            if (!spell) {
                await interaction.update({ content: 'Spell not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(spell.name)
                .setURL(spell.url)
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
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            if (err.code === 10062) {
                // DiscordAPIError[10062]: Unknown interaction
                console.error('SPELL SELECT ERROR: Interaction expired or already acknowledged.');
                // Optionally, you could log more details here
            } else {
                console.error('SPELL SELECT ERROR:', err);
            }
            // User-facing message: can't send to Discord, so just log for now
            // If you want to DM the user, you could try interaction.user.send(), but that's not always possible
        }
        return;
    }

    // --- OTHER COMMANDS AND SELECT MENUS ---
    // ... Place your other command and select menu logic here, as in your original code ...

    // --- ITEM COMMAND (local JSON only) ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'item') {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const itemsDir = path.join(__dirname, 'data/items');
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
            let allItems = [];
            for (const cat of categories) {
                const filePath = path.join(itemsDir, `${cat}.json`);
                if (!fs.existsSync(filePath)) continue;
                const items = JSON.parse(fs.readFileSync(filePath, 'utf8')).map(item => ({ ...item, _category: cat }));
                allItems = allItems.concat(items);
            }
            // Find exact and partial matches (case-insensitive)
            const exactItem = allItems.find(i => typeof i.name === 'string' && i.name.toLowerCase() === query);
            const partialMatches = allItems.filter(i => typeof i.name === 'string' && i.name.toLowerCase().includes(query));
            if (!exactItem && partialMatches.length > 1) {
                const options = partialMatches.slice(0, 25).map(i => ({
                    label: i.name.slice(0, 100),
                    value: `${i._category}|${i.name}`
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
                    flags: 64 // ephemeral
                });
                return;
            }
            const item = exactItem || partialMatches[0];
            if (!item) {
                await interaction.editReply({ content: 'Item not found. If you selected from a menu and see this error, the menu may have expired. Please re-run the command.', flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(item.name)
                .setColor(0x5865F2)
                .setDescription(item.description || '—');
            if (item.rarity) embed.addFields({ name: 'Rarity', value: item.rarity, inline: true });
            if (item.type) embed.addFields({ name: 'Type', value: item.type, inline: true });
            if (typeof item.attuned !== 'undefined') embed.addFields({ name: 'Requires Attunement', value: item.attuned ? 'Yes' : 'No', inline: true });
            if (item.source) embed.addFields({ name: 'Source', value: item.source, inline: false });
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('ITEM ERROR:', err);
            try {
                await interaction.editReply({ content: `Error fetching item information.`, flags: 64 });
            } catch {}
        }
        return;
    }

    // --- MAGICITEM SELECT MENU HANDLER ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'magicitem_select') {
        try {
            const selectedName = interaction.values[0];
            const filePath = path.join(__dirname, 'data/magicitems.json');
            const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

            const item = items.find(i => typeof i.name === 'string' && i.name === selectedName);
            if (!item) {
                await interaction.update({ content: 'Magic item not found.', components: [], flags: 64 });
                return;
            }

            const itemName = typeof item.name === 'string' ? item.name : 'Unknown';
            const itemUrl = typeof item.url === 'string' ? item.url : null;
            const itemDescription = typeof item.description === 'string' && item.description.length > 0
                ? item.description.slice(0, 4096)
                : '—';
            const rarity = (typeof item.rarity === 'string' ? item.rarity : "???").toLowerCase();
            const color = rarityColors[rarity] ?? 0x5865F2;

            let embed = new EmbedBuilder()
                .setTitle(itemName)
                .setColor(color);

            if (itemUrl) embed.setURL(itemUrl);
            embed.setDescription(itemDescription);

            if (item.rarity) embed.addFields({ name: 'Rarity', value: item.rarity, inline: true });
            if (item.type) embed.addFields({ name: 'Type', value: item.type, inline: true });
            if (typeof item.attuned !== 'undefined') embed.addFields({ name: 'Requires Attunement', value: item.attuned ? 'Yes' : 'No', inline: true });
            if (item.source) embed.addFields({ name: 'Source', value: item.source, inline: false });

            // Remove the select menu and show the result to everyone
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            console.error('MAGICITEM SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching magic item information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- ITEM SELECT MENU HANDLER (items.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'item_select') {
        try {
            const selectedValue = interaction.values[0];
            const itemsDir = path.join(__dirname, 'data/items');
            const [cat, ...nameParts] = selectedValue.split('|');
            const name = nameParts.join('|'); // In case name contains '|'
            const filePath = path.join(itemsDir, `${cat}.json`);
            let foundItem = null;
            if (fs.existsSync(filePath)) {
                try {
                    const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    foundItem = items.find(i => typeof i.name === 'string' && i.name.trim().toLowerCase() === name.trim().toLowerCase());
                } catch (jsonErr) {
                    console.error('ITEM SELECT JSON PARSE ERROR:', jsonErr);
                }
            } else {
                console.error('ITEM SELECT FILE NOT FOUND:', filePath);
            }
            if (!foundItem) {
                console.error('ITEM SELECT NOT FOUND:', { name, filePath });
                await interaction.update({ content: 'Item not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(foundItem.name)
                .setColor(0x5865F2)
                .setDescription(foundItem.description || '—');
            if (foundItem.rarity) embed.addFields({ name: 'Rarity', value: foundItem.rarity, inline: true });
            if (foundItem.type) embed.addFields({ name: 'Type', value: foundItem.type, inline: true });
            if (typeof foundItem.attuned !== 'undefined') embed.addFields({ name: 'Requires Attunement', value: foundItem.attuned ? 'Yes' : 'No', inline: true });
            if (foundItem.source) embed.addFields({ name: 'Source', value: foundItem.source, inline: false });
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            console.error('ITEM SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching item information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- RACE SELECT MENU HANDLER (races.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'race_select') {
        try {
            const selectedName = interaction.values[0];
            const filePath = path.join(__dirname, 'data/races.json');
            const races = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const race = races.find(r => typeof r.name === 'string' && r.name === selectedName);
            if (!race) {
                await interaction.update({ content: 'Race not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(race.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: race.description || '—', inline: false });
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            console.error('RACE SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching race information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- CLASS SELECT MENU HANDLER (classes.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'class_select') {
        try {
            const selectedName = interaction.values[0];
            const filePath = path.join(__dirname, 'data/classes.json');
            const classes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const classObj = classes.find(c => typeof c.name === 'string' && c.name === selectedName);
            if (!classObj) {
                await interaction.update({ content: 'Class not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(classObj.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: classObj.description || '—', inline: false });
            if (classObj.url) embed.setURL(classObj.url);

            let components = [];
            if (Array.isArray(classObj.subclasses) && classObj.subclasses.length > 0) {
                // Only include subclasses that have a name and a url (skip malformed entries)
                const subclassOptions = classObj.subclasses.filter(s => s.name && s.url).slice(0, 25).map(s => ({
                    label: s.name.slice(0, 100),
                    value: s.name
                }));
                if (subclassOptions.length > 0) {
                    const subclassRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('subclass_select')
                            .setPlaceholder('Select a subclass')
                            .addOptions(subclassOptions)
                    );
                    components.push(subclassRow);
                }
            }
            await interaction.update({ content: null, components, embeds: [embed] });
        } catch (err) {
            console.error('CLASS SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching class information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- SUBCLASS SELECT MENU HANDLER (classes.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'subclass_select') {
        try {
            const selectedValue = interaction.values[0];
            // Parse composite value: ClassName|SubclassName|SubclassUrl
            const [className, subclassName, subclassUrl] = selectedValue.split('|');
            const filePath = path.join(__dirname, 'data/classes.json');
            const classes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Find the parent class
            const parentClass = classes.find(c => typeof c.name === 'string' && c.name === className);
            if (!parentClass || !Array.isArray(parentClass.subclasses)) {
                await interaction.update({ content: 'Subclass not found.', components: [], flags: 64 });
                return;
            }
            // Find the subclass by name and url (ensures uniqueness)
            const foundSubclass = parentClass.subclasses.find(s => s.name === subclassName && s.url === subclassUrl);
            if (!foundSubclass) {
                await interaction.update({ content: 'Subclass not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(`${parentClass.name}: ${foundSubclass.name}`)
                .setURL(foundSubclass.url || null)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: foundSubclass.description || '—', inline: false });
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            console.error('SUBCLASS SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching subclass information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- FEAT SELECT MENU HANDLER (feats.json only) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'feat_select') {
        try {
            const selectedName = interaction.values[0];
            const filePath = path.join(__dirname, 'data/feats.json');
            const feats = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const feat = feats.find(f => typeof f.name === 'string' && f.name === selectedName);
            if (!feat) {
                await interaction.update({ content: 'Feat not found.', components: [], flags: 64 });
                return;
            }
            let embed = new EmbedBuilder()
                .setTitle(feat.name)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: feat.description || '—', inline: false });
            if (feat.url) embed.setURL(feat.url);
            await interaction.update({ content: null, components: [], embeds: [embed] });
        } catch (err) {
            console.error('FEAT SELECT ERROR:', err);
            try { await interaction.update({ content: `Error fetching feat information.`, components: [], flags: 64 }); } catch {}
        }
        return;
    }

    // --- COMMAND HANDLER (from commands folder) ---
    if (interaction.isChatInputCommand()) {
        const command = commandsMap.get(interaction.commandName);
        if (command) {
            await command.execute(interaction);
        }
    }
});

const commandsMap = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commandsMap.set(command.name, command);
}

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});