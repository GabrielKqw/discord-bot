import { Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { pool } from '../discord.service';

export async function handleMuteCommand(message: Message) {
  const args = message.content.split(' ').slice(1);

  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, '');
  const reason = args.slice(1, -1).join(' ') || 'Sem motivo especificado';
  const time = args[args.length - 1];

  if (!userId || !time) {
    return message.reply('Uso incorreto do comando. Use: `!mute <id ou menção> <motivo> <tempo>`');
  }

  try {
    const member = await message.guild.members.fetch(userId);

    let duration = 0;
    const match = time.match(/(\d+)([dhm])/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          if (amount > 28) {
            return message.reply('O limite máximo para mute é de 28 dias.');
          }
          duration = amount * 24 * 60 * 60 * 1000;
          break;
        case 'h':
          duration = amount * 60 * 60 * 1000;
          break;
        case 'm':
          duration = amount * 60 * 1000;
          break;
      }
    }

    if (duration <= 0) {
      return message.reply('Tempo inválido. Use o formato `Xd`, `Xh` ou `Xm`.');
    }

    const muteCheckResult = await pool.query('SELECT * FROM mutes WHERE user_id = $1', [userId]);

    if (muteCheckResult.rows.length > 0) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription(`O usuário <@${userId}> já está mutado.`);
      return message.reply({ embeds: [embed] });
    }

    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    const muteDMEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Você foi mutado ❗')
      .setDescription(
        
        `**Tempo:** ${days} dia(s), ${hours} hora(s) e ${minutes} minuto(s)\n\n` +
        `Caso haja dúvidas referentes à sua punição ou acredita que foi um equívoco, entre em contato com algum de nossos moderadores.`,
      );

    try {
      await member.send({ embeds: [muteDMEmbed] });
    } catch (error) {
      console.error('Não foi possível enviar mensagem na DM do usuário:', error);
    }

    await member.timeout(duration, reason);

    const endTime = new Date(Date.now() + duration);

    await pool.query(
      'INSERT INTO mutes (user_id, moderator_id, reason, duration) VALUES ($1, $2, $3, $4)',
      [userId, message.author.id, reason, endTime.toISOString()],
    );

    await pool.query(
      'INSERT INTO punishments (user_id, moderator_id, type, reason, duration) VALUES ($1, $2, $3, $4, $5)',
      [userId, message.author.id, 'mute', reason, endTime.toISOString()],
    );

    const muteEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Usuário mutado')
      .setDescription(`**Usuário:** ${member.user.tag}\n**Motivo:** ${reason}\n**Duração:** ${time}`)
      .setTimestamp();

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [muteEmbed] });
    }
  } catch (error) {
    console.error('Erro ao mutar o usuário:', error);
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao mutar o usuário.');
    message.reply({ embeds: [errorEmbed] });
  }
}