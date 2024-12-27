import { Message, EmbedBuilder, PermissionsBitField, TextChannel } from 'discord.js';
import { pool } from '../discord.service';

export async function handleUnmuteCommand(message: Message) {
  const args = message.content.split(' ').slice(1);


  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return;
  }

  const userId = args[0]?.replace(/[<@!>]/g, '');
  const reason = args.slice(1).join(' ') || 'Sem motivo especificado';

  if (!userId) {
    return message.reply('Uso incorreto do comando. Use: `!unmute <id ou menção> <motivo>`');
  }

  const member = message.guild.members.cache.get(userId);

  if (!member) {
    return message.reply('Usuário não encontrado.');
  }

  try {

    await member.timeout(null, reason);

    await pool.query(
      'INSERT INTO punishments (user_id, moderator_id, type, reason) VALUES ($1, $2, $3, $4)',
      [userId, message.author.id, 'unmute', reason],
    );

    const unmuteEmbed = new EmbedBuilder()
      .setColor('#00ff00') 
      .setTitle('Usuário desmutado')
      .setDescription(`**Usuário:** ${member.user.tag}\n**Motivo:** ${reason}`)
      .setTimestamp();

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [unmuteEmbed] });
    }
  } catch (error) {
    console.error('Erro ao desmutar o usuário:', error);
    message.reply('Ocorreu um erro ao desmutar o usuário.');
  }
}