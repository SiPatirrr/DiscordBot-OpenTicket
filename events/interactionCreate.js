const {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const logPayment = require('../functions/logPayment');
const payments = require('../store/payments');
const { getStaffRole } = require('../utils/staff');
const { STAFF_ROLE_NAME, PAYMENT_LOG_CHANNEL } = require('../config');

module.exports = async (interaction) => {
    if (!interaction.guild) return;
  
    const guild  = interaction.guild;
    const user   = interaction.user;
    const member = interaction.member;
  
    // ---- Guard: pastikan staff role ada ----
    const staffRole = getStaffRole(guild);
    if (!staffRole) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌  Role **${STAFF_ROLE_NAME}** tidak ditemukan di server ini.`)
            .setColor(0xe74c3c)
        ],
        ephemeral: true
      });
    }
  
    // ================= OPEN PAYMENT FORM =================
    if (interaction.isButton() && interaction.customId === "open_payment_form") {
  
      // Hanya staff yang bisa membuka form
      if (!member.roles.cache.has(staffRole.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  Hanya **Pembantu Raja** yang dapat mengisi form pembayaran.")
              .setColor(0xe74c3c)
          ],
          ephemeral: true
        });
      }
  
      const modal = new ModalBuilder()
        .setCustomId("payment_modal")
        .setTitle("Form Pembayaran");
  
      const targetUserInput = new TextInputBuilder()
        .setCustomId("target_user")
        .setLabel("User ID (penerima notifikasi)")
        .setPlaceholder("Contoh: 123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Jumlah Pembayaran (contoh: 150.000)")
        .setPlaceholder("Masukkan nominal tanpa Rp")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      const methodInput = new TextInputBuilder()
        .setCustomId("method")
        .setLabel("Metode Pembayaran")
        .setPlaceholder("Contoh: GoPay, OVO, Transfer BCA, QRIS")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  
      const noteInput = new TextInputBuilder()
        .setCustomId("note")
        .setLabel("Catatan Tambahan (opsional)")
        .setPlaceholder("Informasi tambahan jika ada...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);
  
      modal.addComponents(
        new ActionRowBuilder().addComponents(targetUserInput),
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(methodInput),
        new ActionRowBuilder().addComponents(noteInput)
      );
  
      return interaction.showModal(modal);
    }
  
    // ================= MODAL SUBMIT =================
    if (interaction.isModalSubmit() && interaction.customId === "payment_modal") {
  
      const rawTargetId = interaction.fields.getTextInputValue("target_user").trim();
      const amount      = interaction.fields.getTextInputValue("amount");
      const method      = interaction.fields.getTextInputValue("method");
      const note        = interaction.fields.getTextInputValue("note") || "-";
  
      // Bersihkan ID dari mention format <@123> atau <@!123>
      const cleanId = rawTargetId.replace(/[^0-9]/g, "");
  
      const targetMember = await guild.members.fetch(cleanId).catch(() => null);
      if (!targetMember) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  User tidak ditemukan. Pastikan ID yang dimasukkan benar.")
              .setColor(0xe74c3c)
          ],
          ephemeral: true
        });
      }
  
      await logPayment(guild, targetMember.user, user, amount, method, note);
  
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅  Data Terkirim")
            .setDescription(
              `Form pembayaran untuk ${targetMember} berhasil dikirim.\n` +
              "Tim admin akan segera melakukan verifikasi."
            )
            .setColor(0x2ecc71)
            .setFooter({ text: "Payment System" })
            .setTimestamp()
        ],
        ephemeral: true
      });
    }
  
    // ================= APPROVE / REJECT =================
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("approve_") || interaction.customId.startsWith("reject_"))
    ) {
  
      if (!member.roles.cache.has(staffRole.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌  Hanya **Pembantu Raja** yang dapat melakukan approve/reject.")
              .setColor(0xe74c3c)
          ],
          ephemeral: true
        });
      }
  
      const parts     = interaction.customId.split("_");
      const action    = parts[0];                // "approve" | "reject"
      const paymentId = parts.slice(1).join("_"); // sisa string = ID
  
      const data = payments.get(paymentId);
      if (!data) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("⚠️  Data pembayaran tidak ditemukan (mungkin sudah diproses sebelumnya).")
              .setColor(0xe67e22)
          ],
          ephemeral: true
        });
      }
  
      const isApprove  = action === "approve";
      const statusText = isApprove ? "🟢  **SUCCESS**" : "🔴  **FAILED**";
      const color      = isApprove ? 0x2ecc71 : 0xe74c3c;
      const actionBy   = `${user.username} — <t:${Math.floor(Date.now()/1000)}:R>`;
  
      // Update embed di verif channel
      const updatedVerif = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(color)
        .setTitle(isApprove ? "✅  Payment Approved" : "❌  Payment Rejected")
        .spliceFields(5, 1, { name: "📊  Status",    value: statusText, inline: true })
        .spliceFields(6, 1, { name: "👮  Diproses oleh", value: actionBy, inline: false });
  
      await interaction.update({ embeds: [updatedVerif], components: [] });
  
      // Update embed di log channel
      const logChannel = guild.channels.cache.find(c => c.name === PAYMENT_LOG_CHANNEL);
      if (logChannel) {
        const logMsg = await logChannel.messages.fetch(data.logMessageId).catch(() => null);
        if (logMsg) {
          const updatedLog = EmbedBuilder.from(logMsg.embeds[0])
            .setColor(color)
            .setTitle(isApprove ? "✅  Payment Approved" : "❌  Payment Rejected")
            .spliceFields(5, 1, { name: "📊  Status",    value: statusText, inline: true })
            .spliceFields(6, 1, { name: "👮  Diproses oleh", value: actionBy, inline: false });
  
          await logMsg.edit({ embeds: [updatedLog] });
        }
      }
  
      // DM ke user
      const targetMember = await guild.members.fetch(data.userId).catch(() => null);
      if (targetMember) {
        const dmEmbed = new EmbedBuilder()
          .setTitle(isApprove ? "✅  Pembayaran Dikonfirmasi" : "❌  Pembayaran Ditolak")
          .setDescription(
            isApprove
              ? "Pembayaran kamu telah **disetujui** oleh admin. Terima kasih!"
              : "Mohon maaf, pembayaran kamu **ditolak** oleh admin. Silakan hubungi staff untuk informasi lebih lanjut."
          )
          .addFields({ name: "🆔  Payment ID", value: `\`${paymentId}\`` })
          .setColor(color)
          .setFooter({ text: "Payment System" })
          .setTimestamp();
  
        targetMember.send({ embeds: [dmEmbed] }).catch(() => {});
      }
  
      // Hapus dari memory
      payments.delete(paymentId);
    }
  
    // ================= TICKET: START =================
    if (interaction.isButton() && interaction.customId === 'start_ticket') {
  
      const menu = new StringSelectMenuBuilder()
        .setCustomId('select_ticket')
        .setPlaceholder('Pilih kategori bantuan...')
        .addOptions([
          { label: 'Pembayaran', description: 'Kendala transaksi atau tagihan', value: 'pembayaran', emoji: '💳' },
          { label: 'Aplikasi',   description: 'Bug atau masalah teknis',        value: 'aplikasi',  emoji: '📱' },
          { label: 'Lainnya',    description: 'Pertanyaan umum atau lainnya',   value: 'lainnya',   emoji: '❓' }
        ]);
  
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("Pilih kategori yang sesuai dengan kebutuhanmu:")
            .setColor(0x3498db)
        ],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }
  
    // ================= TICKET: SELECT =================
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
  
      const type = interaction.values[0];
  
      const existing = guild.channels.cache.find(c => c.topic === user.id);
      if (existing) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌  Kamu masih memiliki ticket aktif: ${existing}\nSelesaikan ticket tersebut sebelum membuat yang baru.`)
              .setColor(0xe74c3c)
          ],
          ephemeral: true
        });
      }
  
      const safeName = user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
      const channel = await guild.channels.create({
        name: `ticket-${type}-${safeName}`,
        type: ChannelType.GuildText,
        topic: user.id,
        permissionOverwrites: [
          { id: guild.id,      deny:  [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id,       allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: staffRole.id,  allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });
  
      const categoryEmoji = { pembayaran: "💳", aplikasi: "📱", lainnya: "❓" };
  
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${categoryEmoji[type] ?? "🎫"}  Ticket Baru — ${type.charAt(0).toUpperCase() + type.slice(1)}`)
            .setDescription(
              `Halo ${user}, selamat datang di ticket kamu!\n\n` +
              `Silakan jelaskan masalah kamu secara **detail** agar staff dapat membantu lebih cepat.\n\u200b`
            )
            .addFields(
              { name: "👤  Pengguna",  value: `<@${user.id}>`,  inline: true },
              { name: "📂  Kategori",  value: type,             inline: true },
              { name: "\u200b", value: "Untuk menutup ticket, gunakan perintah `!close`." }
            )
            .setColor(0x3498db)
            .setFooter({ text: "Support System  •  Tim kami akan segera merespons" })
            .setTimestamp()
        ]
      });
  
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`✅  Ticket berhasil dibuat: ${channel}\nTim kami akan segera merespons.`)
            .setColor(0x2ecc71)
        ],
        ephemeral: true
      });
    }
};