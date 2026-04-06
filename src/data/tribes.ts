import type { Tribe, Character } from '../types'

export const tribes: Tribe[] = [
  {
    id: 'tribe-marvel',
    name: 'Marvel',
    icon: '🦸',
    description: 'Os maiores heróis e vilões da Marvel!',
    universe: 'Marvel',
  },
  {
    id: 'tribe-dbz',
    name: 'Guerreiros Saiyajin',
    icon: '⚡',
    description: 'Supere seus limites como um verdadeiro Saiyajin!',
    universe: 'Dragon Ball',
  },
  {
    id: 'tribe-hp',
    name: 'Bruxos de Hogwarts',
    icon: '🧙',
    description: 'Aprenda magia e sabedoria no mundo bruxo!',
    universe: 'Harry Potter',
  },
  {
    id: 'tribe-sw',
    name: 'Ordem Jedi',
    icon: '⚔️',
    description: 'Que a Forca esteja com voce!',
    universe: 'Star Wars',
  },
  {
    id: 'tribe-naruto',
    name: 'Ninjas de Konoha',
    icon: '🍃',
    description: 'Siga o caminho ninja e proteja sua vila!',
    universe: 'Naruto',
  },
  {
    id: 'tribe-atletas',
    name: 'Atletas',
    icon: '🏆',
    description: 'Supere recordes e conquiste medalhas!',
    universe: 'Esportes',
  },
  {
    id: 'tribe-rockstars',
    name: 'Rockstars',
    icon: '🎸',
    description: 'Toque sua musica e conquiste o mundo!',
    universe: 'Musica',
  },
  {
    id: 'tribe-aventureiros',
    name: 'Aventureiros',
    icon: '🗡️',
    description: 'Explore dungeons e derrote dragoes!',
    universe: 'Fantasia',
  },
]

// archetype: 'hero' | 'villain' | 'neutral'
// gender_filter: 'male' | 'female' | 'neutral'
export const characters: Character[] = [
  // ===== MARVEL — Masculino Herói =====
  { id: 'marvel-mh-1', tribe_id: 'tribe-marvel', tier: 1, name: 'Gaviao Arqueiro', description: 'Sempre mirando no alvo certo.', min_points: 0, archetype: 'hero', gender_filter: 'male' },
  { id: 'marvel-mh-2', tribe_id: 'tribe-marvel', tier: 2, name: 'Homem Formiga', description: 'Pequenos atos fazem grande diferenca.', min_points: 100, archetype: 'hero', gender_filter: 'male' },
  { id: 'marvel-mh-3', tribe_id: 'tribe-marvel', tier: 3, name: 'Homem de Ferro', description: 'Sua armadura e feita de boas acoes.', min_points: 300, archetype: 'hero', gender_filter: 'male' },
  { id: 'marvel-mh-4', tribe_id: 'tribe-marvel', tier: 4, name: 'Thor', description: 'O trovao acompanha sua chegada. Voce e digno!', min_points: 600, archetype: 'hero', gender_filter: 'male' },
  { id: 'marvel-mh-5', tribe_id: 'tribe-marvel', tier: 5, name: 'Capitao America', description: 'O escudo da justica esta em suas maos!', min_points: 1000, archetype: 'hero', gender_filter: 'male' },

  // ===== MARVEL — Feminino Herói =====
  { id: 'marvel-fh-1', tribe_id: 'tribe-marvel', tier: 1, name: 'Agente Carter', description: 'Determinada desde o primeiro dia.', min_points: 0, archetype: 'hero', gender_filter: 'female' },
  { id: 'marvel-fh-2', tribe_id: 'tribe-marvel', tier: 2, name: 'Viuva Negra', description: 'Agil e determinada.', min_points: 100, archetype: 'hero', gender_filter: 'female' },
  { id: 'marvel-fh-3', tribe_id: 'tribe-marvel', tier: 3, name: 'Vespa', description: 'Pequena mas poderosa.', min_points: 300, archetype: 'hero', gender_filter: 'female' },
  { id: 'marvel-fh-4', tribe_id: 'tribe-marvel', tier: 4, name: 'Feiticeira Escarlate', description: 'Seu poder transforma realidades.', min_points: 600, archetype: 'hero', gender_filter: 'female' },
  { id: 'marvel-fh-5', tribe_id: 'tribe-marvel', tier: 5, name: 'Capita Marvel', description: 'Mais alto, mais longe, mais rapido!', min_points: 1000, archetype: 'hero', gender_filter: 'female' },

  // ===== MARVEL — Vilão/Anti-herói =====
  { id: 'marvel-v-1', tribe_id: 'tribe-marvel', tier: 1, name: 'Loki (jovem)', description: 'O deus da travessura comeca sua jornada.', min_points: 0, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'marvel-v-2', tribe_id: 'tribe-marvel', tier: 2, name: 'Venom', description: 'O simbionte desperta.', min_points: 100, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'marvel-v-3', tribe_id: 'tribe-marvel', tier: 3, name: 'Deadpool', description: 'Anti-heroi com estilo.', min_points: 300, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'marvel-v-4', tribe_id: 'tribe-marvel', tier: 4, name: 'Magneto', description: 'O mestre do magnetismo.', min_points: 600, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'marvel-v-5', tribe_id: 'tribe-marvel', tier: 5, name: 'Thanos', description: 'Inevitavel. Lendario.', min_points: 1000, archetype: 'villain', gender_filter: 'neutral' },

  // ===== DRAGON BALL — Herói =====
  { id: 'dbz-h-1', tribe_id: 'tribe-dbz', tier: 1, name: 'Saiyajin', description: 'Todo guerreiro comeca com um primeiro passo.', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'dbz-h-2', tribe_id: 'tribe-dbz', tier: 2, name: 'Super Saiyajin', description: 'Seu poder esta despertando!', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'dbz-h-3', tribe_id: 'tribe-dbz', tier: 3, name: 'Super Saiyajin 2', description: 'Os raios cercam voce!', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'dbz-h-4', tribe_id: 'tribe-dbz', tier: 4, name: 'Super Saiyajin 3', description: 'Poder maximo ativado!', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'dbz-h-5', tribe_id: 'tribe-dbz', tier: 5, name: 'Ultra Instinct', description: 'Alem dos limites. Perfeicao!', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },

  // ===== DRAGON BALL — Feminino =====
  { id: 'dbz-f-1', tribe_id: 'tribe-dbz', tier: 1, name: 'Videl', description: 'Coragem que vem do coracao.', min_points: 0, archetype: 'hero', gender_filter: 'female' },
  { id: 'dbz-f-2', tribe_id: 'tribe-dbz', tier: 2, name: 'Android 18', description: 'Forca incomparavel.', min_points: 100, archetype: 'hero', gender_filter: 'female' },
  { id: 'dbz-f-3', tribe_id: 'tribe-dbz', tier: 3, name: 'Caulifla', description: 'Super Saiyajin natural!', min_points: 300, archetype: 'hero', gender_filter: 'female' },
  { id: 'dbz-f-4', tribe_id: 'tribe-dbz', tier: 4, name: 'Kale', description: 'Poder lendario despertado.', min_points: 600, archetype: 'hero', gender_filter: 'female' },
  { id: 'dbz-f-5', tribe_id: 'tribe-dbz', tier: 5, name: 'Vados', description: 'Anjo do Universo 6. Transcendental.', min_points: 1000, archetype: 'hero', gender_filter: 'female' },

  // ===== DRAGON BALL — Vilão =====
  { id: 'dbz-v-1', tribe_id: 'tribe-dbz', tier: 1, name: 'Raditz', description: 'O primeiro desafio Saiyajin.', min_points: 0, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'dbz-v-2', tribe_id: 'tribe-dbz', tier: 2, name: 'Zarbon', description: 'Elegancia e poder oculto.', min_points: 100, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'dbz-v-3', tribe_id: 'tribe-dbz', tier: 3, name: 'Cell', description: 'A forma perfeita.', min_points: 300, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'dbz-v-4', tribe_id: 'tribe-dbz', tier: 4, name: 'Freeza', description: 'O imperador do universo.', min_points: 600, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'dbz-v-5', tribe_id: 'tribe-dbz', tier: 5, name: 'Jiren', description: 'Forca que transcende o tempo.', min_points: 1000, archetype: 'villain', gender_filter: 'neutral' },

  // ===== HARRY POTTER — Herói =====
  { id: 'hp-h-1', tribe_id: 'tribe-hp', tier: 1, name: 'Neville Longbottom', description: 'Coragem verdadeira comeca com humildade.', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'hp-h-2', tribe_id: 'tribe-hp', tier: 2, name: 'Ron Weasley', description: 'Lealdade acima de tudo.', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'hp-h-3', tribe_id: 'tribe-hp', tier: 3, name: 'Hermione Granger', description: 'Inteligencia e bravura combinadas.', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'hp-h-4', tribe_id: 'tribe-hp', tier: 4, name: 'Severo Snape', description: 'O heroi silencioso. Sempre.', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'hp-h-5', tribe_id: 'tribe-hp', tier: 5, name: 'Alvo Dumbledore', description: 'Sabedoria ilumina o caminho.', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },

  // ===== HARRY POTTER — Vilão =====
  { id: 'hp-v-1', tribe_id: 'tribe-hp', tier: 1, name: 'Draco Malfoy', description: 'Ambicao como combustivel.', min_points: 0, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'hp-v-2', tribe_id: 'tribe-hp', tier: 2, name: 'Belatriz Lestrange', description: 'Devocao sombria.', min_points: 100, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'hp-v-3', tribe_id: 'tribe-hp', tier: 3, name: 'Lucius Malfoy', description: 'Poder nas sombras.', min_points: 300, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'hp-v-4', tribe_id: 'tribe-hp', tier: 4, name: 'Nagini', description: 'A serpente lendaria.', min_points: 600, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'hp-v-5', tribe_id: 'tribe-hp', tier: 5, name: 'Voldemort', description: 'Aquele-Que-Nao-Deve-Ser-Nomeado.', min_points: 1000, archetype: 'villain', gender_filter: 'neutral' },

  // ===== STAR WARS — Herói Masculino =====
  { id: 'sw-mh-1', tribe_id: 'tribe-sw', tier: 1, name: 'Youngling', description: 'A Forca e forte em voce.', min_points: 0, archetype: 'hero', gender_filter: 'male' },
  { id: 'sw-mh-2', tribe_id: 'tribe-sw', tier: 2, name: 'Padawan', description: 'Seu mestre esta orgulhoso.', min_points: 100, archetype: 'hero', gender_filter: 'male' },
  { id: 'sw-mh-3', tribe_id: 'tribe-sw', tier: 3, name: 'Cavaleiro Jedi', description: 'O sabre de luz e seu!', min_points: 300, archetype: 'hero', gender_filter: 'male' },
  { id: 'sw-mh-4', tribe_id: 'tribe-sw', tier: 4, name: 'Mestre Jedi', description: 'Sabedoria e poder em equilibrio.', min_points: 600, archetype: 'hero', gender_filter: 'male' },
  { id: 'sw-mh-5', tribe_id: 'tribe-sw', tier: 5, name: 'Grao-Mestre', description: 'O conselho se curva diante de voce!', min_points: 1000, archetype: 'hero', gender_filter: 'male' },

  // ===== STAR WARS — Herói Feminino =====
  { id: 'sw-fh-1', tribe_id: 'tribe-sw', tier: 1, name: 'Ahsoka (jovem)', description: 'Padawan corajosa.', min_points: 0, archetype: 'hero', gender_filter: 'female' },
  { id: 'sw-fh-2', tribe_id: 'tribe-sw', tier: 2, name: 'Padme Amidala', description: 'Diplomacia e coragem.', min_points: 100, archetype: 'hero', gender_filter: 'female' },
  { id: 'sw-fh-3', tribe_id: 'tribe-sw', tier: 3, name: 'Ahsoka (adulta)', description: 'Guerreira independente.', min_points: 300, archetype: 'hero', gender_filter: 'female' },
  { id: 'sw-fh-4', tribe_id: 'tribe-sw', tier: 4, name: 'Princesa Leia', description: 'Lider da resistencia.', min_points: 600, archetype: 'hero', gender_filter: 'female' },
  { id: 'sw-fh-5', tribe_id: 'tribe-sw', tier: 5, name: 'Rey', description: 'Esperanca da galaxia.', min_points: 1000, archetype: 'hero', gender_filter: 'female' },

  // ===== STAR WARS — Vilão =====
  { id: 'sw-v-1', tribe_id: 'tribe-sw', tier: 1, name: 'Stormtrooper', description: 'Um soldado no imperio.', min_points: 0, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'sw-v-2', tribe_id: 'tribe-sw', tier: 2, name: 'Boba Fett', description: 'O cacador de recompensas.', min_points: 100, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'sw-v-3', tribe_id: 'tribe-sw', tier: 3, name: 'Conde Dookan', description: 'Mestre Sith.', min_points: 300, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'sw-v-4', tribe_id: 'tribe-sw', tier: 4, name: 'Darth Maul', description: 'Furia do lado sombrio.', min_points: 600, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'sw-v-5', tribe_id: 'tribe-sw', tier: 5, name: 'Darth Vader', description: 'O Lorde Sith supremo.', min_points: 1000, archetype: 'villain', gender_filter: 'neutral' },

  // ===== NARUTO — Herói =====
  { id: 'naruto-h-1', tribe_id: 'tribe-naruto', tier: 1, name: 'Genin', description: 'Sua bandana brilha!', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'naruto-h-2', tribe_id: 'tribe-naruto', tier: 2, name: 'Chunin', description: 'Suas habilidades crescem.', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'naruto-h-3', tribe_id: 'tribe-naruto', tier: 3, name: 'Jonin', description: 'Elite ninja!', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'naruto-h-4', tribe_id: 'tribe-naruto', tier: 4, name: 'Kage', description: 'Lider supremo!', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'naruto-h-5', tribe_id: 'tribe-naruto', tier: 5, name: 'Hokage', description: 'Voce e o Hokage da bondade!', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },

  // ===== NARUTO — Feminino =====
  { id: 'naruto-f-1', tribe_id: 'tribe-naruto', tier: 1, name: 'Hinata', description: 'Gentileza como forca.', min_points: 0, archetype: 'hero', gender_filter: 'female' },
  { id: 'naruto-f-2', tribe_id: 'tribe-naruto', tier: 2, name: 'Sakura', description: 'Forca e cura.', min_points: 100, archetype: 'hero', gender_filter: 'female' },
  { id: 'naruto-f-3', tribe_id: 'tribe-naruto', tier: 3, name: 'Temari', description: 'Vento cortante.', min_points: 300, archetype: 'hero', gender_filter: 'female' },
  { id: 'naruto-f-4', tribe_id: 'tribe-naruto', tier: 4, name: 'Tsunade', description: 'A lendaria Sannin.', min_points: 600, archetype: 'hero', gender_filter: 'female' },
  { id: 'naruto-f-5', tribe_id: 'tribe-naruto', tier: 5, name: 'Kushina', description: 'A Habanero Sangrenta. Lenda.', min_points: 1000, archetype: 'hero', gender_filter: 'female' },

  // ===== NARUTO — Vilão =====
  { id: 'naruto-v-1', tribe_id: 'tribe-naruto', tier: 1, name: 'Haku', description: 'Beleza gelada.', min_points: 0, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'naruto-v-2', tribe_id: 'tribe-naruto', tier: 2, name: 'Orochimaru', description: 'A serpente imortal.', min_points: 100, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'naruto-v-3', tribe_id: 'tribe-naruto', tier: 3, name: 'Deidara', description: 'Arte e explosao!', min_points: 300, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'naruto-v-4', tribe_id: 'tribe-naruto', tier: 4, name: 'Pain', description: 'O mundo conhecera a dor.', min_points: 600, archetype: 'villain', gender_filter: 'neutral' },
  { id: 'naruto-v-5', tribe_id: 'tribe-naruto', tier: 5, name: 'Madara', description: 'O ninja mais poderoso da historia.', min_points: 1000, archetype: 'villain', gender_filter: 'neutral' },

  // ===== ATLETAS =====
  { id: 'atl-1', tribe_id: 'tribe-atletas', tier: 1, name: 'Iniciante', description: 'Primeiro treino completo!', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'atl-2', tribe_id: 'tribe-atletas', tier: 2, name: 'Bronze', description: 'Sua primeira medalha!', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'atl-3', tribe_id: 'tribe-atletas', tier: 3, name: 'Prata', description: 'Podio garantido!', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'atl-4', tribe_id: 'tribe-atletas', tier: 4, name: 'Ouro', description: 'Campeao!', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'atl-5', tribe_id: 'tribe-atletas', tier: 5, name: 'Platina', description: 'Recordista mundial!', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },

  // ===== ROCKSTARS =====
  { id: 'rock-1', tribe_id: 'tribe-rockstars', tier: 1, name: 'Garagem', description: 'O som comeca na garagem!', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'rock-2', tribe_id: 'tribe-rockstars', tier: 2, name: 'Indie', description: 'Seu som e unico!', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'rock-3', tribe_id: 'tribe-rockstars', tier: 3, name: 'Mainstream', description: 'Tocando nas radios!', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'rock-4', tribe_id: 'tribe-rockstars', tier: 4, name: 'Gold Record', description: 'Disco de ouro!', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'rock-5', tribe_id: 'tribe-rockstars', tier: 5, name: 'Hall of Fame', description: 'Imortalizado na historia!', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },

  // ===== AVENTUREIROS =====
  { id: 'aven-1', tribe_id: 'tribe-aventureiros', tier: 1, name: 'Aldeao', description: 'A aventura chama!', min_points: 0, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'aven-2', tribe_id: 'tribe-aventureiros', tier: 2, name: 'Aventureiro', description: 'Primeira masmorra conquistada!', min_points: 100, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'aven-3', tribe_id: 'tribe-aventureiros', tier: 3, name: 'Heroi', description: 'A vila te celebra!', min_points: 300, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'aven-4', tribe_id: 'tribe-aventureiros', tier: 4, name: 'Campeao', description: 'Dragoes tremem!', min_points: 600, archetype: 'hero', gender_filter: 'neutral' },
  { id: 'aven-5', tribe_id: 'tribe-aventureiros', tier: 5, name: 'Lenda', description: 'Seu nome esta nos livros de historia!', min_points: 1000, archetype: 'hero', gender_filter: 'neutral' },
]
