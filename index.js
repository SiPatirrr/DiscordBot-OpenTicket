require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Events
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CATEGORY_ID = null; // isi kalau mau pakai kategori

// READY
client.once('clientReady', () => {
  console.log(`Login sebagai ${client.user.tag}`);
});

// PANEL COMMAND
client.on('messageCreate', async (message) => {
  if (!message.guild) return;

  if (message.content === '!ticket') {
    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Buat Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({
      content: 'Klik tombol untuk membuat ticket',
      components: [row]
    });
  }
});

// INTERACTION
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;

  const guild = interaction.guild;
  const user = interaction.user;

  // cari role staff berdasarkan nama
  const staffRole = guild.roles.cache.find(
    r => r.name.toLowerCase() === "pembantu raja"
  );

  if (!staffRole) {
    return interaction.reply({
      content: "❌ Role 'Pembantu Raja' tidak ditemukan!",
      ephemeral: true
    });
  }

  // ================= CREATE =================
  if (interaction.customId === 'create_ticket') {
    const existing = guild.channels.cache.find(
      (c) => c.topic === user.id
    );

    if (existing) {
      return interaction.reply({
        content: '❌ Kamu sudah punya ticket!',
        ephemeral: true
      });
    }

    // amanin nama
    const safeName = user.username
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();

    const channel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID || null,
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

    // tombol close
    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await channel.send({
      content: `Halo ${user} 👋\nSilakan jelaskan masalah kamu.\n\nStaff akan membantu kamu.`,
      components: [row]
    });

    await interaction.reply({
      content: `✅ Ticket kamu: ${channel}`,
      ephemeral: true
    });

    // AUTO CLOSE 7 HARI
    setTimeout(async () => {
      if (!channel || !channel.deletable) return;

      await channel.send("⏰ Ticket otomatis ditutup setelah 7 hari.");
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }, 7 * 24 * 60 * 60 * 1000);
  }

  // ================= CLOSE =================
  if (interaction.customId === 'close_ticket') {
    const member = await guild.members.fetch(user.id);

    if (!member.roles.cache.has(staffRole.id)) {
      return interaction.reply({
        content: '❌ Hanya staff yang bisa menutup ticket!',
        ephemeral: true
      });
    }

    await interaction.reply("🔒 Menutup ticket dalam 5 detik...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

client.login(process.env.TOKEN);