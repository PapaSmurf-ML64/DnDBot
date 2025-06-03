const { JSDOM } = require('jsdom');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

// Register the Draconis font for D&D style
registerFont(path.join(__dirname, '../data/Draconis.otf'), { family: 'Draconis' });

function sanitizeFilename(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function generateMonsterImage(monster, outPath) {
    // --- DYNAMIC HEIGHT CALCULATION (IMPROVED) ---
    // Use canvas to measure actual text wrapping for more accurate height
    const width = 530;
    // Temporary canvas for measurement
    const tempCanvas = createCanvas(width, 1000);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'bold 16px serif';
    const baseHeight = 250; // header, stat block, ability bar
    function measureBlock(name, desc) {
        let lineHeight = 18;
        let total = lineHeight; // name
        if (desc) {
            tempCtx.font = '16px serif';
            const maxWidth = width - 60;
            const words = desc.split(' ');
            let line = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = tempCtx.measureText(testLine);
                if (metrics.width > maxWidth && line.length > 0) {
                    total += lineHeight;
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            if (line.length > 0) total += lineHeight;
        }
        return total;
    }
    function measureSection(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        let h = 30; // section header
        for (const entry of arr) {
            const [name, ...descParts] = entry.split('.');
            h += measureBlock((name || '').trim() + (descParts.length ? '.' : ''), descParts.join('.').trim());
        }
        h += 6; // section spacing
        return h;
    }
    let contentHeight = 0;
    contentHeight += measureSection(monster.traits);
    contentHeight += measureSection(monster.actions);
    // Add more sections if needed (e.g., legendary actions)
    const height = baseHeight + contentHeight + 40;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // DARK THEME COLORS
    const darkBg = '#181818';
    const lightText = '#f8f8f8';
    const accentRed = '#a52a2a';
    const statBlockBox = '#2d2320';

    // Background
    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, width, height);

    // Header (taller, fits name and subheader)
    ctx.fillStyle = accentRed;
    ctx.fillRect(0, 0, width, 90);
    ctx.font = 'bold 32px Draconis, serif';
    ctx.fillStyle = lightText;
    ctx.fillText(monster.name || 'Unknown Creature', 20, 40);
    ctx.font = 'italic 18px Draconis, serif';
    ctx.fillText(monster.size_type_alignment || '', 20, 70);

    // Stat block box (darker)
    ctx.fillStyle = statBlockBox;
    ctx.fillRect(0, 95, width, 60);
    ctx.font = 'bold 18px Draconis, serif';
    ctx.fillStyle = lightText;
    ctx.fillText(`Armor Class ${monster.armor_class || '—'}`, 20, 115);
    ctx.fillText(`Hit Points ${monster.hit_points || '—'}`, 20, 135);
    ctx.fillText(`Speed ${monster.speed || '—'}`, 20, 155);

    // Ability scores
    const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    // Full width, slightly shorter bar
    const abBarY = 165;
    const abBarHeight = 44;
    ctx.fillStyle = accentRed;
    ctx.fillRect(0, abBarY, width, abBarHeight);
    // Draconis for ability score headers
    ctx.font = 'bold 18px Draconis, serif';
    ctx.fillStyle = lightText;
    abilities.forEach((a, i) => {
        ctx.textAlign = 'center';
        const x = (i + 0.5) * (width / abilities.length);
        ctx.fillText(a, x, abBarY + 18);
    });
    // Standard serif for ability score values
    ctx.fillStyle = lightText;
    ctx.font = '18px serif';
    abilities.forEach((a, i) => {
        let val = '10 (+0)';
        if (monster.ability_scores && monster.ability_scores[a]) {
            val = monster.ability_scores[a];
        }
        ctx.textAlign = 'center';
        const x = (i + 0.5) * (width / abilities.length);
        ctx.fillText(val, x, abBarY + 38);
    });
    ctx.textAlign = 'left';

    // Section spacing
    let y = abBarY + abBarHeight + 24; // Move traits header down for more space
    function drawSectionTitle(title) {
        ctx.font = 'bold 26px Draconis, serif'; // Larger section headers
        ctx.fillStyle = accentRed;
        ctx.fillText(title, 20, y);
        y += 30;
    }
    function drawBlock(name, desc) {
        // Standard serif for trait/action names
        ctx.font = 'bold 16px serif';
        ctx.fillStyle = lightText;
        ctx.fillText(name, 30, y);
        y += 18;
        if (desc) {
            ctx.font = '16px serif';
            ctx.fillStyle = lightText;
            // Wrap text for long descriptions
            const maxWidth = width - 60;
            const words = desc.split(' ');
            let line = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line.length > 0) {
                    ctx.fillText(line.trim(), 50, y);
                    y += 18;
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            if (line.length > 0) {
                ctx.fillText(line.trim(), 50, y);
                y += 18;
            }
        }
    }

    // Traits
    if (Array.isArray(monster.traits) && monster.traits.length > 0) {
        drawSectionTitle('Traits');
        for (const trait of monster.traits) {
            const [name, ...descParts] = trait.split('.');
            drawBlock((name || '').trim() + (descParts.length ? '.' : ''), descParts.join('.').trim());
        }
        y += 6;
    }

    // Actions
    if (Array.isArray(monster.actions) && monster.actions.length > 0) {
        drawSectionTitle('Actions');
        for (const action of monster.actions) {
            const [name, ...descParts] = action.split('.');
            drawBlock((name || '').trim() + (descParts.length ? '.' : ''), descParts.join('.').trim());
        }
        y += 6;
    }

    ctx.textAlign = 'left';

    // Save image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buffer);
}

module.exports = {
    name: 'monster',
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const query = interaction.options.getString('name').trim().toLowerCase();
            const filePath = path.join(__dirname, '../data/monsters.json');
            const monsters = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const partials = monsters.filter(m => typeof m.name === 'string' && m.name.toLowerCase().includes(query));
            const exact = monsters.find(m => typeof m.name === 'string' && m.name.toLowerCase() === query);
            if (partials.length > 1) {
                const options = partials.slice(0, 25).map(m => ({
                    label: m.name.slice(0, 100),
                    value: m.name
                }));
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('monster_select')
                        .setPlaceholder('Select a monster')
                        .addOptions(options)
                );
                await interaction.editReply({
                    content: 'Multiple monsters found. Please select one:',
                    components: [row],
                    flags: 64
                });
                return;
            }
            const monster = partials[0] || exact;
            if (!monster) {
                await interaction.editReply({ content: 'Monster not found.', flags: 64 });
                return;
            }
            // Generate or reuse image
            const imagesDir = path.join(__dirname, '../data/images');
            if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
            const imgName = sanitizeFilename(monster.name) + '.png';
            const imgPath = path.join(imagesDir, imgName);
            if (!fs.existsSync(imgPath)) {
                await generateMonsterImage(monster, imgPath);
            }
            const attachment = new AttachmentBuilder(imgPath);
            let embed = new EmbedBuilder()
                .setTitle(monster.name)
                .setColor(0xA52A2A)
                .setImage('attachment://' + imgName)
                .addFields({ name: 'Stat Block', value: 'See image below.', inline: false });
            await interaction.editReply({ embeds: [embed], files: [imgPath] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching monster information.`, flags: 64 }); } catch {}
        }
    },
    generateMonsterImage
};