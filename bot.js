require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const User = require('./models/User');
const db = require('./config/database');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Menu Utama
const mainMenu = Markup.keyboard([
  ['💵 Setor Tabungan', '💰 Tarik Tabungan'],
  ['📊 Cek Saldo', '📋 Riwayat Transaksi'],
  ['ℹ️ Info Bot', '👥 Bantuan']
]).resize();

// Start Command
bot.start(async (ctx) => {
  const user = await User.findOrCreate(
    ctx.from.id, 
    ctx.from.username, 
    ctx.from.first_name
  );
  
  const welcomeText = `💫 *Selamat Datang di Bot Tabungan Digital* 💫

✨ *Fitur Utama:*
• 💵 Setor Tabungan kapan saja
• 💰 Tarik Tabungan minimal Rp 20.000
• 📊 Cek Saldo real-time
• 📋 Riwayat transaksi transparan

🛡 *Keamanan Terjamin* - Data tersimpan aman di database

Gunakan menu di bawah untuk mulai transaksi:`;

  await ctx.replyWithPhoto(
    { url: 'https://files.catbox.moe/vzn03h.jpg' },
    {
      caption: welcomeText,
      parse_mode: 'Markdown',
      ...mainMenu
    }
  );
});

// Handler Setor Tabungan
bot.hears('💵 Setor Tabungan', async (ctx) => {
  const paymentText = `💳 *Cara Setor Tabungan:*

1. Transfer ke Dana: *${process.env.DANA_NUMBER}*
2. Scan QRIS berikut: [QRIS](${process.env.QRIS_URL})
3. Setelah transfer, kirim bukti transfer ke admin

📌 *Ketentuan:*
• Minimal setor: Rp 10.000
• Saldo akan update setelah konfirmasi admin
• Batas waktu konfirmasi 1x24 jam`;

  await ctx.replyWithPhoto(
    { url: process.env.QRIS_URL },
    {
      caption: paymentText,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📱 QRIS Payment', process.env.QRIS_URL)],
        [Markup.button.callback('✅ Konfirmasi Pembayaran', 'confirm_payment')]
      ])
    }
  );
});

// Handler Cek Saldo
bot.hears('📊 Cek Saldo', async (ctx) => {
  const saldo = await User.getSaldo(ctx.from.id);
  const saldoText = `📊 *Info Saldo Anda*

👤 Nama: ${ctx.from.first_name}
💳 Saldo: *Rp ${saldo.toLocaleString('id-ID')}*

💫 Terima kasih telah menabung bersama kami!`;

  await ctx.replyWithPhoto(
    { url: 'https://files.catbox.moe/8a9q9e.png' },
    {
      caption: saldoText,
      parse_mode: 'Markdown',
      ...mainMenu
    }
  );
});

// Handler Tarik Tabungan
bot.hears('💰 Tarik Tabungan', async (ctx) => {
  const saldo = await User.getSaldo(ctx.from.id);
  const minWithdraw = parseInt(process.env.MIN_WITHDRAW);
  
  if (saldo < minWithdraw) {
    return ctx.reply(`❌ *Penarikan Gagal*

Saldo Anda: Rp ${saldo.toLocaleString('id-ID')}
Minimal penarikan: Rp ${minWithdraw.toLocaleString('id-ID')}

💡 Silakan tambah saldo Anda terlebih dahulu`, 
{ parse_mode: 'Markdown' });
  }

  const withdrawText = `💰 *Tarik Tabungan*

Saldo tersedia: Rp ${saldo.toLocaleString('id-ID')}
Minimal penarikan: Rp ${minWithdraw.toLocaleString('id-ID')}

💳 Masukkan jumlah penarikan:`;
  
  ctx.reply(withdrawText, {
    parse_mode: 'Markdown',
    ...Markup.forceReply()
  });
});

// Handler Reply untuk jumlah tarik
bot.on('message', async (ctx) => {
  if (ctx.message.reply_to_message) {
    const replyText = ctx.message.reply_to_message.text;
    if (replyText.includes('Masukkan jumlah penarikan')) {
      const amount = parseInt(ctx.message.text);
      const minWithdraw = parseInt(process.env.MIN_WITHDRAW);
      const saldo = await User.getSaldo(ctx.from.id);

      if (isNaN(amount)) {
        return ctx.reply('❌ Format jumlah tidak valid!');
      }

      if (amount < minWithdraw) {
        return ctx.reply(`❌ Minimal penarikan adalah Rp ${minWithdraw.toLocaleString('id-ID')}`);
      }

      if (amount > saldo) {
        return ctx.reply(`❌ Saldo tidak mencukupi! Saldo Anda: Rp ${saldo.toLocaleString('id-ID')}`);
      }

      // Proses penarikan
      await User.updateSaldo(ctx.from.id, -amount);
      
      const successText = `✅ *Penarikan Berhasil*

Jumlah penarikan: Rp ${amount.toLocaleString('id-ID')}
Saldo tersisa: Rp ${(saldo - amount).toLocaleString('id-ID')}

💳 Dana akan ditransfer ke akun Dana Anda dalam 1x24 jam`;

      await ctx.replyWithPhoto(
        { url: 'https://files.catbox.moe/7p7v9p.png' },
        {
          caption: successText,
          parse_mode: 'Markdown',
          ...mainMenu
        }
      );
    }
  }
});

// Error Handling
bot.catch((err, ctx) => {
  console.error('Error occurred:', err);
  ctx.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi.');
});

// Launch Bot
bot.launch().then(() => {
  console.log('Bot started successfully');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));