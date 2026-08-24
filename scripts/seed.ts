import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { User } from "../src/models/user";
import { GlobalGame } from "../src/models/game";
import { UserGame, GAME_STATUSES } from "../src/models/user-game";
import { GameList } from "../src/models/game-list";

const EMAIL = "demo@save-state.dev";
const PASSWORD = "demo12345";

type SeedGame = {
  name: string;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string;
  summary: string;
  status: (typeof GAME_STATUSES)[number];
  hoursPlayed: number;
  timesFinished: number;
  rating?: number;
  lists: string[];
};

const LIST_NAMES = [
  "Zerados 2026",
  "Jogando agora",
  "Backlog eterno",
  "Roguelikes e casuais",
  "Caça a conquistas",
];

const GAMES: SeedGame[] = [
  { name: "The Legend of Zelda: Breath of the Wild", genres: ["Action-Adventure"], platforms: ["Switch", "Wii U"], developers: ["Nintendo EPD"], publishers: ["Nintendo"], releaseDate: "2017-03-03", summary: "Explore Hyrule em um mundo aberto.", status: "finished", hoursPlayed: 120, timesFinished: 1, rating: 10, lists: ["Zerados 2026"] },
  { name: "The Legend of Zelda: Tears of the Kingdom", genres: ["Action-Adventure"], platforms: ["Switch"], developers: ["Nintendo EPD"], publishers: ["Nintendo"], releaseDate: "2023-05-12", summary: "A sequência direta de Breath of the Wild.", status: "playing", hoursPlayed: 45, timesFinished: 0, lists: ["Jogando agora"] },
  { name: "Elden Ring", genres: ["RPG", "Action"], platforms: ["PC", "PS5", "Xbox Series"], developers: ["FromSoftware"], publishers: ["Bandai Namco"], releaseDate: "2022-02-25", summary: "Um RPG de ação em mundo aberto nas Terras Intermédias.", status: "stalled", hoursPlayed: 60, timesFinished: 0, rating: 9, lists: ["Backlog eterno"] },
  { name: "Hades", genres: ["Roguelike", "Action"], platforms: ["PC", "Switch"], developers: ["Supergiant Games"], publishers: ["Supergiant Games"], releaseDate: "2020-09-17", summary: "Escape do submundo grego repetidamente.", status: "endless", hoursPlayed: 95, timesFinished: 0, rating: 9, lists: ["Roguelikes e casuais"] },
  { name: "Hades II", genres: ["Roguelike", "Action"], platforms: ["PC", "Switch"], developers: ["Supergiant Games"], publishers: ["Supergiant Games"], releaseDate: "2024-05-06", summary: "Melinoe enfrenta Cronos neste roguelike.", status: "achievement", hoursPlayed: 30, timesFinished: 0, lists: ["Roguelikes e casuais", "Caça a conquistas"] },
  { name: "Baldur's Gate 3", genres: ["RPG"], platforms: ["PC", "PS5"], developers: ["Larian Studios"], publishers: ["Larian Studios"], releaseDate: "2023-08-03", summary: "RPG baseado em D&D 5e.", status: "limbo", hoursPlayed: 15, timesFinished: 0, lists: ["Backlog eterno"] },
  { name: "The Witcher 3: Wild Hunt", genres: ["RPG"], platforms: ["PC", "PS4", "Switch"], developers: ["CD Projekt Red"], publishers: ["CD Projekt"], releaseDate: "2015-05-19", summary: "Geralt procura Ciri em um mundo aberto.", status: "replaying", hoursPlayed: 180, timesFinished: 2, rating: 10, lists: ["Zerados 2026", "Jogando agora"] },
  { name: "Cyberpunk 2077", genres: ["RPG", "Shooter"], platforms: ["PC", "PS5"], developers: ["CD Projekt Red"], publishers: ["CD Projekt"], releaseDate: "2020-12-10", summary: "Vida em Night City no ano 2077.", status: "dropped", hoursPlayed: 8, timesFinished: 0, rating: 5, lists: ["Backlog eterno"] },
  { name: "Stardew Valley", genres: ["Simulation", "RPG"], platforms: ["PC", "Switch"], developers: ["ConcernedApe"], publishers: ["ConcernedApe"], releaseDate: "2016-02-26", summary: "Administre a fazenda do seu avô.", status: "endless", hoursPlayed: 210, timesFinished: 0, rating: 9, lists: ["Roguelikes e casuais"] },
  { name: "Balatro", genres: ["Roguelike", "Card Game"], platforms: ["PC", "Switch", "Mobile"], developers: ["LocalThunk"], publishers: ["Playstack"], releaseDate: "2024-02-20", summary: "Poker roguelike que consome horas.", status: "endless", hoursPlayed: 70, timesFinished: 0, rating: 9, lists: ["Roguelikes e casuais"] },
  { name: "Hollow Knight", genres: ["Metroidvania", "Platformer"], platforms: ["PC", "Switch"], developers: ["Team Cherry"], publishers: ["Team Cherry"], releaseDate: "2017-02-24", summary: "Explore o reino de Hallownest.", status: "achievement", hoursPlayed: 55, timesFinished: 1, rating: 9, lists: ["Caça a conquistas", "Zerados 2026"] },
  { name: "Celeste", genres: ["Platformer"], platforms: ["PC", "Switch"], developers: ["Maddy Makes Games"], publishers: ["Maddy Makes Games"], releaseDate: "2018-01-25", summary: "Escale a montanha Celeste.", status: "finished", hoursPlayed: 25, timesFinished: 1, rating: 9, lists: ["Zerados 2026"] },
  { name: "God of War Ragnarök", genres: ["Action-Adventure"], platforms: ["PS5", "PS4"], developers: ["Santa Monica Studio"], publishers: ["Sony"], releaseDate: "2022-11-09", summary: "Kratos e Atreus no Fimbulvetr.", status: "playing", hoursPlayed: 35, timesFinished: 0, lists: ["Jogando agora"] },
  { name: "Red Dead Redemption 2", genres: ["Action-Adventure"], platforms: ["PC", "PS4"], developers: ["Rockstar Games"], publishers: ["Rockstar Games"], releaseDate: "2018-10-26", summary: "A história da gangue Van der Linde.", status: "backlog", hoursPlayed: 5, timesFinished: 0, lists: ["Backlog eterno"] },
  { name: "Persona 5 Royal", genres: ["JRPG"], platforms: ["PS5", "PC", "Switch"], developers: ["Atlus"], publishers: ["Atlus"], releaseDate: "2019-10-31", summary: "Ladrões fantasma reformam corações.", status: "limbo", hoursPlayed: 20, timesFinished: 0, lists: ["Backlog eterno"] },
  { name: "Final Fantasy VII Rebirth", genres: ["JRPG"], platforms: ["PS5"], developers: ["Square Enix"], publishers: ["Square Enix"], releaseDate: "2024-02-29", summary: "A jornada continua além de Midgar.", status: "playing", hoursPlayed: 40, timesFinished: 0, lists: ["Jogando agora"] },
  { name: "Metroid Dread", genres: ["Metroidvania"], platforms: ["Switch"], developers: ["MercurySteam"], publishers: ["Nintendo"], releaseDate: "2021-10-08", summary: "Samus enfrenta os EMMI em ZDR.", status: "finished", hoursPlayed: 18, timesFinished: 1, rating: 8, lists: ["Zerados 2026"] },
  { name: "Super Mario Odyssey", genres: ["Platformer"], platforms: ["Switch"], developers: ["Nintendo EPD"], publishers: ["Nintendo"], releaseDate: "2017-10-27", summary: "Mario viaja o mundo com Cappy.", status: "achievement", hoursPlayed: 65, timesFinished: 1, rating: 9, lists: ["Caça a conquistas", "Zerados 2026"] },
  { name: "Slay the Spire", genres: ["Roguelike", "Card Game"], platforms: ["PC", "Switch"], developers: ["Mega Crit"], publishers: ["Humble Games"], releaseDate: "2019-01-23", summary: "Construa um deck e suba a torre.", status: "endless", hoursPlayed: 130, timesFinished: 0, rating: 8, lists: ["Roguelikes e casuais"] },
  { name: "Dead Cells", genres: ["Roguelike", "Metroidvania"], platforms: ["PC", "Switch"], developers: ["Motion Twin"], publishers: ["Motion Twin"], releaseDate: "2018-08-07", summary: "Morra, aprenda, repita.", status: "achievement", hoursPlayed: 80, timesFinished: 0, rating: 8, lists: ["Roguelikes e casuais", "Caça a conquistas"] },
  { name: "Sekiro: Shadows Die Twice", genres: ["Action"], platforms: ["PC", "PS4"], developers: ["FromSoftware"], publishers: ["Activision"], releaseDate: "2019-03-22", summary: "Um shinobi busca vingança em Sengoku.", status: "dropped", hoursPlayed: 12, timesFinished: 0, rating: 7, lists: ["Backlog eterno"] },
  { name: "Disco Elysium", genres: ["RPG"], platforms: ["PC", "Switch"], developers: ["ZA/UM"], publishers: ["ZA/UM"], releaseDate: "2019-10-15", summary: "Detetive amnésico resolve um caso em Revachol.", status: "finished", hoursPlayed: 32, timesFinished: 1, rating: 10, lists: ["Zerados 2026"] },
  { name: "Outer Wilds", genres: ["Adventure", "Puzzle"], platforms: ["PC", "PS5", "Switch"], developers: ["Mobius Digital"], publishers: ["Annapurna Interactive"], releaseDate: "2019-05-28", summary: "Um loop temporal de 22 minutos no espaço.", status: "finished", hoursPlayed: 28, timesFinished: 1, rating: 10, lists: ["Zerados 2026"] },
  { name: "Vampire Survivors", genres: ["Roguelite", "Action"], platforms: ["PC", "Switch", "Mobile"], developers: ["poncle"], publishers: ["poncle"], releaseDate: "2022-10-20", summary: "Sobreviva a hordas por 30 minutos.", status: "endless", hoursPlayed: 90, timesFinished: 0, lists: ["Roguelikes e casuais"] },
  { name: "Hollow Knight: Silksong", genres: ["Metroidvania"], platforms: ["PC", "Switch", "PS5"], developers: ["Team Cherry"], publishers: ["Team Cherry"], releaseDate: "2025-09-04", summary: "A aventura de Hornet em Pharloom.", status: "wishlist", hoursPlayed: 0, timesFinished: 0, lists: [] },
  { name: "Clair Obscur: Expedition 33", genres: ["JRPG"], platforms: ["PC", "PS5", "Xbox Series"], developers: ["Sandfall Interactive"], publishers: ["Kepler Interactive"], releaseDate: "2025-04-24", summary: "Expedição contra a Paintress.", status: "playing", hoursPlayed: 22, timesFinished: 0, rating: 9, lists: ["Jogando agora"] },
  { name: "Astro Bot", genres: ["Platformer"], platforms: ["PS5"], developers: ["Team Asobi"], publishers: ["Sony"], releaseDate: "2024-09-06", summary: "Resgate os bots espalhados pela galáxia.", status: "achievement", hoursPlayed: 30, timesFinished: 1, rating: 9, lists: ["Zerados 2026", "Caça a conquistas"] },
  { name: "Factorio", genres: ["Simulation", "Strategy"], platforms: ["PC", "Switch"], developers: ["Wube Software"], publishers: ["Wube Software"], releaseDate: "2020-08-14", summary: "Construa fábricas em um planeta alienígena.", status: "endless", hoursPlayed: 150, timesFinished: 0, lists: ["Roguelikes e casuais"] },
  { name: "Chrono Trigger", genres: ["JRPG"], platforms: ["SNES", "PC", "Mobile"], developers: ["Square"], publishers: ["Square Enix"], releaseDate: "1995-03-11", summary: "Uma jornada através do tempo.", status: "replaying", hoursPlayed: 40, timesFinished: 3, rating: 10, lists: ["Zerados 2026", "Jogando agora"] },
  { name: "Bloodborne", genres: ["Action", "RPG"], platforms: ["PS4"], developers: ["FromSoftware"], publishers: ["Sony"], releaseDate: "2015-03-24", summary: "Caçadores em Yharnam.", status: "limbo", hoursPlayed: 18, timesFinished: 0, rating: 9, lists: ["Backlog eterno", "Caça a conquistas"] },
];

async function main() {
  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27018/save-state";
  await mongoose.connect(uri);
  console.log(`connected to ${uri}`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user =
    (await User.findOne({ email: EMAIL })) ??
    (await User.create({ name: "Demo Player", email: EMAIL, passwordHash }));
  console.log(`user: ${user.email}`);

  // wipe previous seed data for this user
  await Promise.all([
    UserGame.deleteMany({ userId: user._id }),
    GameList.deleteMany({ userId: user._id }),
    GlobalGame.deleteMany({ source: "manual" }),
  ]);

  const listIds = new Map<string, mongoose.Types.ObjectId>();
  for (const name of LIST_NAMES) {
    const list = await GameList.create({ userId: user._id, name });
    listIds.set(name, list._id as mongoose.Types.ObjectId);
  }
  console.log(`lists: ${LIST_NAMES.length}`);

  for (const g of GAMES) {
    const game = await GlobalGame.create({
      slug: slugify(g.name, { lower: true, strict: true }),
      name: g.name,
      source: "manual",
      cover: `https://placehold.co/600x400?text=${encodeURIComponent(g.name.slice(0, 20))}`,
      genres: g.genres,
      platforms: g.platforms,
      developers: g.developers,
      publishers: g.publishers,
      releaseDate: g.releaseDate ? new Date(g.releaseDate) : undefined,
      summary: g.summary || undefined,
    });

    const memberships = [...new Set(g.lists)].map((l) => listIds.get(l)!).filter(Boolean);
    await UserGame.create({
      userId: user._id,
      gameId: game._id,
      status: g.status,
      hoursPlayed: g.hoursPlayed,
      timesFinished: g.timesFinished,
      rating: g.rating,
      listIds: memberships,
    });
  }
  console.log(`games seeded: ${GAMES.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
