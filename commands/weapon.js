const { JSDOM } = require('jsdom');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'weapon',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const itemName = interaction.options.getString('name').trim().toLowerCase().replace(/\s+/g, '-');
            const category = 'weapons'; // Change this for each command as needed
            const url = `https://dnd5e.wikidot.com/${category}:${itemName}`;

            const res = await fetch(url);
            if (!res.ok) {
                await interaction.editReply({ content: 'Could not fetch weapon details.', flags: 64 });
                return;
            }

            const html = await res.text();
            const dom = new JSDOM(html);
            const doc = dom.window.document;
            const content = doc.querySelector('#page-content');
            if (!content) {
                await interaction.editReply({ content: 'Weapon not found.', flags: 64 });
                return;
            }

            const title = doc.querySelector('h1')?.textContent.trim() || interaction.options.getString('name');
            let desc = '—';
            const firstP = content.querySelector('p');
            if (firstP && firstP.textContent.trim()) desc = firstP.textContent.trim();

            let embed = new EmbedBuilder()
                .setTitle(title)
                .setURL(url)
                .setColor(0x5865F2)
                .addFields({ name: 'Description', value: desc, inline: false });
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try { await interaction.editReply({ content: `Error fetching weapon information.`, flags: 64 }); } catch {}
        }
    }
};