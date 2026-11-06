import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder
} from "discord.js";
const formatCreatedDate = (created) => {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) return created;
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
};
const fetchRobloxProfile = async (username) => {
  const clean = username.trim();
  if (!clean) return null;
  const lookup = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false })
  });
  if (!lookup.ok) return null;
  const lookupJson = await lookup.json();
  const user = lookupJson.data?.[0];
  if (!user?.id) return null;
  const userRes = await fetch(`https://users.roblox.com/v1/users/${user.id}`);
  if (!userRes.ok) return null;
  const userJson = await userRes.json();
  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`
  );
  const thumbJson = await thumbRes.json();
  const avatarUrl = thumbJson.data?.[0]?.imageUrl ?? "";
  return {
    id: userJson.id,
    name: userJson.name,
    displayName: userJson.displayName,
    created: userJson.created,
    profileUrl: `https://www.roblox.com/users/${userJson.id}/profile`,
    avatarUrl
  };
};
const buildRobloxProfileMessage = (profile) => {
  const createdText = formatCreatedDate(profile.created);
  const text = [
    `## Confirmar user roblox - \`@${profile.name}\``,
    "",
    "\u2022 **Informações do usuario:**",
    `-# \u25E6 Roblox id: \`${profile.id}\``,
    `-# \u25E6 Roblox username: \`@${profile.name}\``,
    `-# \u25E6 Roblox display name: \`${profile.displayName}\``,
    `-# \u25E6 Criada em: \`${createdText}\``
  ].join("\n");
  return {
    flags: "IsComponentsV2",
    components: [
      new ContainerBuilder().setAccentColor(65280).addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text)).setThumbnailAccessory(
          new ThumbnailBuilder().setURL(profile.avatarUrl)
        )
      ).addSeparatorComponents(new SeparatorBuilder().setDivider(true)).addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "\u26A0\uFE0F **Observacao:** Confirme se este e o seu usuario do Roblox. Se estiver incorreto, clique em `Não sou eu`."
        )
      ).addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("roblox_edit_username").setLabel("\u21C4 Não sou eu").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setLabel("Ver perfil").setStyle(ButtonStyle.Link).setEmoji("\u{1F517}").setURL(profile.profileUrl)
        )
      )
    ]
  };
};
export {
  buildRobloxProfileMessage,
  fetchRobloxProfile
};
