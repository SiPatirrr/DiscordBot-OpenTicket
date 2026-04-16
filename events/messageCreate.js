const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { isStaff } = require('../utils/staff');

module.exports = async (message) => {
    if (!message.guild || message.author.bot) return;
  
    // ---- !pay (hanya bisa digunakan oleh staff / pembantu raja) ----
    if (message.content === "!pay") {
  
      if (!isStaff(message.member, message.guild)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  Perintah ini hanya bisa digunakan oleh **Pembantu Raja**.")
              .setColor(0xe74c3c)
          ]
        });
      }
  
      const embed = new EmbedBuilder()
        .setTitle("💳  Form Pembayaran")
        .setDescription(
          "Gunakan tombol di bawah untuk mengisi form pembayaran.\n" +
          "Data akan langsung diteruskan ke channel verifikasi.\n\u200b"
        )
        .setColor(0x2ecc71)
        .setFooter({ text: "Payment System  •  Khusus Staff" })
        .setTimestamp();
  
      const button = new ButtonBuilder()
        .setCustomId("open_payment_form")
        .setLabel("💰  Isi Form Pembayaran")
        .setStyle(ButtonStyle.Success);
  
      return message.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
      });
    }
  
    // ---- !ticket ----
    if (message.content === '!ticket') {
  
      const embed = new EmbedBuilder()
        .setTitle("🎫  Pusat Bantuan")
        .setDescription(
          "Butuh bantuan? Buat ticket dan tim kami akan segera merespons.\n\u200b"
        )
        .addFields(
          { name: "💳  Pembayaran",   value: "Kendala terkait pembayaran & transaksi.", inline: false },
          { name: "📱  Aplikasi",     value: "Bug atau masalah teknis pada aplikasi.",  inline: false },
          { name: "❓  Lainnya",      value: "Pertanyaan atau kendala di luar kategori di atas.", inline: false }
        )
        .setColor(0x3498db)
        .setFooter({ text: "Support System  •  Rata-rata respons < 30 menit" })
        .setTimestamp();
  
      const button = new ButtonBuilder()
        .setCustomId('start_ticket')
        .setLabel('📩  Buat Ticket')
        .setStyle(ButtonStyle.Primary);
  
      message.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
      });
    }
  
    // ---- !close (hanya staff) ----
    if (message.content === '!close') {
  
      if (!isStaff(message.member, message.guild)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  Hanya **Pembantu Raja** yang dapat menutup ticket.")
              .setColor(0xe74c3c)
          ]
        });
      }
  
      if (!message.channel.name.startsWith('ticket-')) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  Perintah ini hanya bisa digunakan di dalam channel ticket.")
              .setColor(0xe74c3c)
          ]
        });
      }
  
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("🔒  Ticket ini akan ditutup dalam **5 detik**...")
            .setColor(0x95a5a6)
        ]
      });
  
      setTimeout(() => {
        message.channel.delete().catch(() => {});
      }, 5000);
    }
};