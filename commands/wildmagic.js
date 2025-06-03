const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');

module.exports = {
    name: 'wildmagic',
    data: new SlashCommandBuilder()
        .setName('wildmagic')
        .setDescription('Roll on the Wild Magic Surge table.')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The number to roll for Wild Magic Surge')
                .setRequired(true)
        ),
    description: 'Roll on the Wild Magic Surge table.',
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const number = interaction.options.getInteger('number');
            if (number === null) {
                await interaction.editReply({ content: 'Please provide a number.', flags: 64 });
                return;
            }

            // Google Sheets setup
            const sheets = google.sheets({ version: 'v4' });
            const spreadsheetId = '1y5bGB447xhyMRPTANZkK3REsCpSuKvAzyujxj0ojSQM'; // <-- Replace with your actual sheet ID
            const range = 'Sheet1!A:B'; // <-- Adjust if your sheet/range is different

            // If your sheet is public, you can use an API key:
            const apiKey = process.env.GOOGLE_SHEETS_API_KEY; // Set this in your .env
            let res;
            try {
                res = await Promise.race([
                    sheets.spreadsheets.values.get({ spreadsheetId, range, key: apiKey }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Google Sheets API timeout')), 8000))
                ]);
            } catch (apiErr) {
                await interaction.editReply({ content: `Error fetching data from Google Sheets: ${apiErr.message}`, flags: 64 });
                return;
            }

            const rows = res.data.values;
            if (!rows || rows.length === 0) {
                await interaction.editReply({ content: 'No data found in the sheet.', flags: 64 });
                return;
            }

            // Find the row with the matching number
            const match = rows.find(row => parseInt(row[0], 10) === number);

            if (!match) {
                await interaction.editReply({ content: `No wild magic effect found for number ${number}.`, flags: 64 });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`Wild Magic Surge #${number}`)
                .setDescription(match[1])
                .setColor(0x5865F2);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            try {
                await interaction.editReply({ content: `Error fetching wild magic information.`, flags: 64 });
            } catch {}
        }
    }
};