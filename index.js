require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Events,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= READY =================
client.once('clientReady', () => {
  console.log(`Login sebagai ${client.user.tag}`);
});

// ================= PANEL =================
client.on('messageCreate', async (message) => {
  if (!message.guild) return;

  // PANEL TICKET
  if (message.content === '!ticket') {

    const embed = new EmbedBuilder()
      .setTitle('🎫 Sistem Ticket')
      .setDescription(
        'Silakan tekan tombol di bawah untuk membuat ticket.\n\n' +
        '**Kegunaan ticket:**\n' +
        '• Bantuan pembayaran\n' +
        '• Kendala aplikasi\n' +
        '• Pertanyaan lainnya'
      )
      .setColor(0x2b2d31)
      .setFooter({ text: 'Support System' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('start_ticket')
      .setLabel('Buat Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  // ================= CLOSE COMMAND =================
  if (message.content === '!close') {
    const guild = message.guild;

    const staffRole = guild.roles.cache.find(
      r => r.name.toLowerCase() === "pembantu raja"
    );

    if (!staffRole) return;

    // cek role
    if (!message.member.roles.cache.has(staffRole.id)) {
      return message.reply("❌ Hanya staff yang dapat menutup ticket.");
    }

    // cek channel ticket
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply("❌ Ini bukan channel ticket.");
    }

    await message.reply("🔒 Ticket akan ditutup dalam 5 detik...");

    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 5000);
  }
});

// ================= INTERACTION =================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) return;

  const guild = interaction.guild;
  const user = interaction.user;

  const staffRole = guild.roles.cache.find(
    r => r.name.toLowerCase() === "pembantu raja"
  );

  if (!staffRole) {
    return interaction.reply({
      content: "❌ Role staff tidak ditemukan.",
      ephemeral: true
    });
  }

  // ================= BUTTON =================
  if (interaction.isButton() && interaction.customId === 'start_ticket') {

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_ticket')
      .setPlaceholder('Pilih jenis bantuan')
      .addOptions([
        { label: 'Pembayaran', value: 'pembayaran', emoji: '💳' },
        { label: 'Aplikasi', value: 'aplikasi', emoji: '📱' },
        { label: 'Lainnya', value: 'lainnya', emoji: '❓' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: 'Silakan pilih jenis masalah kamu:',
      components: [row],
      ephemeral: true
    });
  }

  // ================= SELECT =================
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {

    const type = interaction.values[0];

    // limit 1 ticket aktif
    const existing = guild.channels.cache.find(
      (c) => c.topic === user.id
    );

    if (existing) {
      return interaction.reply({
        content: '❌ Kamu masih memiliki ticket aktif.',
        ephemeral: true
      });
    }

    const safeName = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const channel = await guild.channels.create({
      name: `ticket-${type}-${safeName}`,
      type: ChannelType.GuildText,
      topic: user.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: staffRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    // EMBED USER
    const userEmbed = new EmbedBuilder()
      .setTitle('📩 Ticket Dibuat')
      .setDescription(
        `Halo ${user},\n\n` +
        `Terima kasih telah menghubungi kami.\n` +
        `Jenis ticket: **${type}**\n\n` +
        `Silakan jelaskan masalah kamu secara detail.\n` +
        `Tim kami akan segera membantu.`
      )
      .setColor(0x00aaff)
      .setFooter({ text: 'Support System' })
      .setTimestamp();

    await channel.send({ embeds: [userEmbed] });

    interaction.reply({
      content: `✅ Ticket berhasil dibuat: ${channel}`,
      ephemeral: true
    });

    // AUTO CLOSE
    setTimeout(async () => {
      if (!channel.deletable) return;

      await channel.send("⏰ Ticket ditutup otomatis (7 hari).");
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }, 7 * 24 * 60 * 60 * 1000);
  }
});

client.login(process.env.TOKEN);