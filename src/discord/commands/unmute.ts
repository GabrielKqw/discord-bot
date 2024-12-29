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

  try {
    const member = await message.guild.members.fetch(userId);

    if (!member.communicationDisabledUntil) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Erro')
        .setDescription(`O usuário <@${userId}> não está mutado.`);
      return message.reply({ embeds: [embed] });
    }

    await member.timeout(null, reason);

  
    await pool.query('DELETE FROM mutes WHERE user_id = $1', [userId]);


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
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('Erro')
      .setDescription('Ocorreu um erro ao desmutar o usuário.');
    message.reply({ embeds: [embed] });
  }
}