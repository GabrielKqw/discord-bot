import {
  Message,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';
import { pool } from '../discord.service';

export async function handleKickCommand(message: Message) {
  const args = message.content.split(' ').slice(1);

  if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    return; 
  }

  const userId = args[0]?.replace(/[<@!>]/g, '');
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription(
        'Uso incorreto do comando. Use: `!kick <id ou menção> <motivo>`',
      );
    return message.reply({ embeds: [embed] });
  }

  try {
    const member = await message.guild.members.fetch(userId);
    await member.kick(reason);
    await pool.query(
      'INSERT INTO punishments (user_id, moderator_id, type, reason) VALUES ($1, $2, $3, $4)',
      [userId, message.author.id, 'kick', reason],
    );

    const kickEmbed = new EmbedBuilder()
      .setColor('#ffff00')
      .setTitle('Usuário expulso')
      .setDescription(
        `**Usuário:** ${member.user.tag}\n**Moderador:** ${message.author.tag}\n**Motivo:** ${reason}`,
      )
      .setTimestamp();

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [kickEmbed] });
    }
  } catch (error) {
    console.error('Erro ao expulsar o usuário:', error);
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao expulsar o usuário.');
    message.reply({ embeds: [embed] });
  }
}
