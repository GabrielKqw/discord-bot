import { Client, Message, EmbedBuilder, TextChannel } from 'discord.js';

const voiceLogs = new Map<string, string[]>();
const userVoiceState = new Map<string, string | null>();

export function setupVoiceLogs(client: Client) {
  client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.member.user.id;

    if (!voiceLogs.has(userId)) {
      voiceLogs.set(userId, []);
    }

    const logs = voiceLogs.get(userId);

    if (!oldState.channel && newState.channel) {
      logs.push(`${new Date().toLocaleString()}: Entrou no canal <#${newState.channel.id}>`);
      userVoiceState.set(userId, newState.channel.name);
    }

    if (oldState.channel && !newState.channel) {
      logs.push(`${new Date().toLocaleString()}: Saiu do canal <#${oldState.channel.id}>`);
      userVoiceState.set(userId, null);
    }

    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      logs.push(`${new Date().toLocaleString()}: Mudou de <#${oldState.channel.id}> para <#${newState.channel.id}>`);
      userVoiceState.set(userId, newState.channel.name);
    }
  });
}

export async function handleVoiceLogsCommand(message: Message) {
  const args = message.content.split(' ').slice(1);
  const userId = args[0]?.replace(/[<@!>]/g, '');

  if (!userId) {
    return message.reply('Por favor, mencione um usuário ou forneça o ID.');
  }

  const logs = voiceLogs.get(userId);
  const currentChannel = userVoiceState.get(userId);

  if (!logs || logs.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({
        name: `Registro de voz - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`,
        iconURL: message.guild.members.cache.get(userId)?.user.displayAvatarURL(),
      })
      .setDescription('Nenhum registro de voz encontrado.');

    if (message.channel instanceof TextChannel) {
      message.channel.send({ embeds: [emptyEmbed] });
    }
    return;
  }

  const pageSize = 7;
  let page = parseInt(args[1]) || 1;

  const totalPages = Math.ceil(logs.length / pageSize);
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setAuthor({
      name: `Registro de voz - ${message.guild.members.cache.get(userId)?.user.tag || 'Usuário'}`,
      iconURL: message.guild.members.cache.get(userId)?.user.displayAvatarURL(),
    })
    .setDescription(paginatedLogs.map((log) => `- ${log}`).join('\n'))
    .setFooter({ text: `Página ${page} de ${totalPages}` });

  if (currentChannel) {
    embed.addFields([{ name: 'Informações de voz', value: `Conectado em: ${currentChannel}` }]);
  } else {
    embed.addFields([{ name: 'Informações de voz', value: 'Desconectado' }]);
  }

  if (message.channel instanceof TextChannel) {
    message.channel.send({ embeds: [embed] });
  }
}
