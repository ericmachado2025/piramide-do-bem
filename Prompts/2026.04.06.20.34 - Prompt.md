# PROMPT — PIRÂMIDE DO BEM ESCOLAR: Refatoração Completa

## CONTEXTO
Projeto em C:\Users\robso\Projetos\piramide-do-bem
Deploy automático via GitHub → Netlify (piramidedobem.com.br)
SUPABASE_URL=https://frdpscbdtudaulscexyp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ4MzEsImV4cCI6MjA5MDgxMDgzMX0.acvN82Uwmcfy7v5WQfQ-lSLGuYZp7UI2Oyxvbaxlt3o
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s

Script de tribos: C:\Users\robso\Projetos\piramide-do-bem\scripts\Communities.sql

---

## PARTE 1 — BANCO DE DADOS

### 1.1 REGRA CRÍTICA DE IDs
TODOS os IDs de TODAS as tabelas devem ser UUID (não SERIAL, não BIGINT).
Para tribos e personagens: usar os MESMOS GUIDs do campo PublicId do Communities.sql — isso garante compatibilidade futura com o OpenConnection.

### 1.2 Schema completo
Criar via API do Supabase (service key) todas as tabelas:

```sql
-- Escolas (base INEP + instituições especiais)
schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inep_code TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  school_type TEXT DEFAULT 'fundamental', -- 'fundamental', 'medio', 'superior', 'tecnico'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Matérias/Disciplinas
subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL, -- 'fundamental1', 'fundamental2', 'medio', 'superior', 'outros'
  display_order INT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by_teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Turmas
classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  grade TEXT NOT NULL,
  section CHAR(2),
  year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, grade, section, year)
)

-- Professores
teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Vínculo professor → escola → turmas → matérias
teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id),
  school_id UUID REFERENCES schools(id),
  classroom_id UUID REFERENCES classrooms(id),
  subject_id UUID REFERENCES subjects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, classroom_id, subject_id)
)

-- Alunos
students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  school_id UUID REFERENCES schools(id),
  tribe_id UUID REFERENCES tribes(id),
  current_character_id UUID REFERENCES characters(id),
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  last_action_date TIMESTAMPTZ,
  role TEXT DEFAULT 'student',
  parent_consent BOOLEAN DEFAULT FALSE,
  parent_name TEXT,
  parent_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Vínculo aluno → turmas → professores (a partir do 6º ano)
student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  classroom_id UUID REFERENCES classrooms(id),
  teacher_id UUID REFERENCES teachers(id),
  subject_id UUID REFERENCES subjects(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, classroom_id, subject_id)
)

-- Responsáveis (pais)
parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Vínculo pai → aluno
parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  student_id UUID REFERENCES students(id),
  relationship TEXT DEFAULT 'responsavel',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Patrocinadores
sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state CHAR(2),
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Tribos (IDs = PublicId do Communities.sql)
tribes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon_class TEXT,
  color_hex TEXT,
  description TEXT,
  display_order INT
)

-- Personagens (IDs = PublicId do Communities.sql)
characters (
  id UUID PRIMARY KEY,
  tribe_id UUID REFERENCES tribes(id),
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  real_name TEXT,
  description TEXT,
  archetype TEXT, -- 'HERO', 'ANTI_HERO', 'VILLAIN'
  gender TEXT,    -- 'MALE', 'FEMALE', 'NEUTRAL'
  display_order INT,
  min_points INT NOT NULL DEFAULT 0
)

-- Tipos de ação
action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INT
)

-- Ações
actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES students(id),
  action_type_id UUID REFERENCES action_types(id),
  beneficiary_id UUID REFERENCES students(id),
  validator_id UUID REFERENCES students(id),
  description TEXT,
  qr_code_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  points_awarded INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
)

-- Validações
validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES actions(id),
  validator_id UUID REFERENCES students(id),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Recompensas
rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  is_spotlight BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Resgates
redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  reward_id UUID REFERENCES rewards(id),
  qr_code_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Selos
badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT,
  condition_value INT
)

-- Selos do aluno
student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
)

-- Alertas anti-fraude
fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID REFERENCES students(id),
  student_b_id UUID REFERENCES students(id),
  description TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Spotlights semanais
spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  school_id UUID REFERENCES schools(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Verificação de telefone
phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
)
```

### 1.3 Seed de matérias — currículo brasileiro
Popular a tabela subjects com:

**Fundamental 1 (1º ao 5º ano):** Português, Matemática, Ciências, História, Geografia, Arte, Educação Física, Inglês

**Fundamental 2 (6º ao 9º ano):** Português, Matemática, Ciências, História, Geografia, Arte, Educação Física, Inglês, Espanhol, Redação

**Ensino Médio:** Português, Literatura, Redação, Matemática, Física, Química, Biologia, História, Geografia, Filosofia, Sociologia, Arte, Educação Física, Inglês, Espanhol

**Superior/Universidade:** vazio — professores criam as suas próprias (is_custom=TRUE)

Incluir sempre "Outros" como opção livre em todos os níveis.

### 1.4 Escola especial — FURG
Inserir manualmente:
- name: "Universidade Federal do Rio Grande (FURG)"
- city: "Rio Grande"
- state: "RS"
- school_type: "superior"
- latitude: -32.0793
- longitude: -52.1627
- inep_code: NULL

### 1.5 Tribos e personagens — Communities.sql

Ler o arquivo `scripts/Communities.sql`.

**Estrutura real do banco:**
- `communities.Communities` = universos/tribos (campo PublicId = UUID da tribo)
- `communities.Characters` com campo `Archetype`: HERO, ANTI_HERO, VILLAIN
- `communities.Characters` com campo `Gender`: MALE, FEMALE, NEUTRAL
- `communities.Levels` define os tiers via LevelId (ordenar por DisplayOrder dentro de cada Community para mapear tier 1-5)
- Usar `PublicId` (GUID) como `id` nas tabelas `tribes` e `characters`

**Fluxo de escolha do aluno — 3 passos:**
1. Escolhe o **Universo** (tribo): Marvel, Dragon Ball, Harry Potter, Star Wars, Naruto, Atletas, Rockstars, Aventureiros
2. Escolhe o **Archetype**: Herói / Anti-Herói / Vilão (filtrado pelos archetypes disponíveis naquela comunidade)
3. Escolhe o **Gênero** se aplicável: Masculino / Feminino / Neutro

O sistema seleciona automaticamente o personagem Tier 1 correspondente e apresenta a progressão dos 5 tiers.

**Mapeamento communities.Communities → tribes da Pirâmide:**

| Filtro no Communities.sql | Tribo na Pirâmide |
|---|---|
| Name contém "Marvel" + Archetype HERO + Gender MALE | Marvel Heroes |
| Name contém "Marvel" + Archetype HERO + Gender FEMALE | Marvel Heroines |
| Name contém "Dragon Ball" ou "Saiyajin" | Guerreiros Saiyajin |
| Name contém "Harry Potter" ou "Hogwarts" | Bruxos de Hogwarts |
| Name contém "Star Wars" ou "Jedi" | Ordem Jedi |
| Name contém "Naruto" ou "My Hero" ou "Konoha" | Ninjas de Konoha |
| Name contém "Atletas" ou "Sports" | Atletas |
| Name contém "Rock" ou "Music" | Rockstars |
| Name contém "RPG" ou "Adventure" | Aventureiros |

Para cada combinação universo+archetype+gênero: selecionar personagens ordenados por DisplayOrder e distribuir nos tiers 1-5.
`min_points`: tier1=0, tier2=100, tier3=300, tier4=600, tier5=1000.
Salvar `tribe_id` e `character_id` usando os `PublicId` originais como UUID.

### 1.6 Base INEP — todas as escolas ativas do Brasil
Baixar: https://download.inep.gov.br/dados_abertos/microdados_educacao_basica/microdados_censo_escolar_2023.zip

Filtrar: `IN_SITUACAO_FUNCIONAMENTO = 1` (ativas)

Campos a importar:
- `CO_ENTIDADE` → inep_code
- `NO_ENTIDADE` → name
- `NO_MUNICIPIO` → city
- `SG_UF` → state
- `NU_LATITUDE` → latitude
- `NU_LONGITUDE` → longitude

Importar em lotes de 500 via Supabase API. Total esperado: ~150-180 mil escolas.
**Não criar dados fake de escolas em hipótese alguma.**

### 1.7 Tipos de ação (seed)
1. Ajudei colega no dever — 10pts — 📚
2. Mediei um conflito — 25pts — ⚖️
3. Incluí colega excluído — 20pts — 🤝
4. Fiz silêncio pra alguém estudar — 5pts — 🤫
5. Ensinei algo que sei — 15pts — 🎓
6. Ajudei com material — 8pts — ✏️
7. Defendi colega do bullying — 30pts — 🛡️
8. Organizei algo coletivo — 20pts — 🗂️

---

## PARTE 2 — REMOÇÃO TOTAL DE DADOS FAKE

Remover **absolutamente todos** os dados hardcoded do código fonte:
- Arrays de escolas fake → busca real no Supabase
- Arrays de tribos/personagens fake → busca real no Supabase
- Alunos simulados → dados reais de students
- Ações simuladas no feed → busca real de actions
- Ranking simulado → QualiScore calculado em tempo real
- **Mapa: SOMENTE mostrar pins de escolas que têm alunos cadastrados — zero pins fake**

O mapa deve estar vazio até que usuários reais se cadastrem. Isso é intencional e correto.

---

## PARTE 3 — MÓDULOS NOVOS E ATUALIZADOS

### 3.1 Landing page (/) — pública
Dois botões apenas:
- **[Entrar]** → `/login` (campo email + senha; Supabase Auth identifica o role automaticamente e redireciona para o dashboard correto)
- **[Cadastrar-se]** → `/cadastro/perfil`

**Tela `/cadastro/perfil`** — segunda tela, escolha do perfil antes de qualquer formulário:
- 🎮 Sou Aluno → `/cadastro/aluno`
- 📊 Sou Professor → `/professor/cadastro`
- 👨‍👩‍👧 Sou Responsável → `/responsavel/cadastro`
- 🏪 Sou Patrocinador → `/patrocinador/cadastro`

**Painel público `/estatisticas`** — sem login, acessível por qualquer pessoa sem cadastro:
- Total de alunos cadastrados
- Total de boas ações validadas
- Total de escolas ativas no mapa
- Mapa dinâmico com pins reais das escolas com alunos
- Top 10 escolas mais engajadas
- Top 3 tribos mais populares
- Link visível na landing page: "Ver impacto →"

### 3.2 Módulo Professor (/professor/*)

**Cadastro (`/professor/cadastro`):**
- Nome completo, email, telefone
- Escola: dropdown UF → cidade → escola (base INEP + FURG)
- Nível de ensino: Fundamental 1 / Fundamental 2 / Médio / Superior / Outro
- Matérias: seleção múltipla da lista de subjects do nível + opção "Outra matéria" (campo livre, salva como `is_custom=TRUE`)
- Turmas: após selecionar escola, selecionar quais turmas leciona (pode criar nova turma se não existir)
- Um professor pode ter múltiplos `teacher_assignments` (escola + turma + matéria)

**Verificação dupla obrigatória:**
- Email: Supabase Auth Magic Link
- Telefone: gerar código 6 dígitos, salvar em `phone_verifications`, mostrar tela "Digite o código enviado para seu celular". Por ora: exibir o código no `console.log` e em um `alert` na tela (substituir por SMS real depois)

**Dashboard (`/professor/dashboard`):**
- Seletor de turma/matéria no topo (baseado nos `teacher_assignments` reais)
- Métricas reais dos alunos vinculados via `student_enrollments`
- Alertas de fraude reais da tabela `fraud_alerts`
- Ranking de tribos real

### 3.3 Módulo Responsável (/responsavel/*)

**Cadastro:** nome, email, telefone, nome do aluno vinculado

**Verificação dupla:** email + telefone (mesmo fluxo do professor)

**Vinculação:** buscar aluno por nome + escola, criar registro em `parent_students`

**Dashboard:** ver ações e pontuação real do(s) filho(s), aprovar consentimento LGPD via `parent_students.consent_given`

### 3.4 Módulo Patrocinador (/patrocinador/*)

**Cadastro:** nome do negócio, responsável, email, telefone, cidade, estado

**Verificação dupla:** email + telefone (mesmo fluxo)

**Dashboard (`/patrocinador/dashboard`):**
- Cadastrar recompensas (nome, descrição, pontos, validade)
- Ver resgates reais de suas recompensas via `redemptions`
- Marcar ofertas como "Sexta do Patrocinador" (`is_spotlight=TRUE`)

### 3.5 Vínculo aluno → turmas → professores

Na tela de cadastro do aluno (após selecionar escola), exibir:

> "A partir do 6º ano você tem vários professores. Selecione suas turmas:"

- Lista de `teacher_assignments` da escola selecionada
- Aluno seleciona quais turmas/professores/matérias participa
- Salvar em `student_enrollments`

---

## PARTE 4 — DEPLOY

Após concluir tudo:

```bash
git add .
git commit -m "refactor: banco real com UUIDs, módulos completos, zero dados fake, FURG incluída, painel público"
git push origin main
```

Netlify detecta o push e faz deploy automático.

---

## REGRAS DE TRABALHO
- NUNCA mostrar código na tela — apenas estatísticas +/- ao final de cada etapa
- `str_replace` para edições, nunca reescrever arquivos inteiros
- Usar agentes paralelos para tarefas independentes
- Checkpoint numerado a cada parte concluída
- Se atingir 70% de tokens: parar, fazer checkpoint, avisar
- NÃO criar nenhum dado fake em nenhuma hipótese
