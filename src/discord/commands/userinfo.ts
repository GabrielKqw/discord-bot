import { Client, Message, EmbedBuilder, TextChannel, GuildMember } from 'discord.js';

export async function handleUserInfoCommand(message: Message) {
  let member: GuildMember;
  const args = message.content.split(' ').slice(1);
  const userId = args[0]?.replace(/[<@!>]/g, '');

  if (userId) {
    member = message.guild.members.cache.get(userId);
    if (!member) {
      return message.reply('Usuário não encontrado.');
    }
  } else {
    member = message.member;
  }

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Servidor 🎄')
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL({ size: 128 }),
    })
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: 'Membro:', value: `${member.user.tag} | ${member.user.id}`, inline: false },
      { name: 'Criação da conta', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
      { name: 'Entrada no servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
      {
        name: 'Informações de voz',
        value: member.voice.channel ? `Conectado em ${member.voice.channel.name}` : 'Desconectado',
        inline: false,
      },
      {
        name: 'Cargos',
        value: member.roles.cache
          .filter((role) => role.id !== message.guild.id)
          .map((role) => role.toString())
          .join(', ') || 'Nenhum',
        inline: false,
      },
     
    )
    .setTimestamp();

  if (message.channel instanceof TextChannel) {
    message.channel.send({ embeds: [embed] });
  }
}
