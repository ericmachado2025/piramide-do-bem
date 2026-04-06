import type { Student } from '../types'
import { characters } from './tribes'
import { schools } from './schools'

const firstNames = [
  'Miguel', 'Arthur', 'Gael', 'Heitor', 'Theo', 'Davi', 'Gabriel', 'Bernardo', 'Samuel', 'Rafael',
  'Lucas', 'Pedro', 'Matheus', 'Enzo', 'Nicolas', 'Lorenzo', 'Gustavo', 'Felipe', 'João', 'Henrique',
  'Isaac', 'Benício', 'Daniel', 'Anthony', 'Leonardo', 'Bryan', 'Eduardo', 'Cauã', 'Vitor', 'Ravi',
  'Helena', 'Alice', 'Laura', 'Maria', 'Valentina', 'Heloísa', 'Sophia', 'Isabella', 'Manuela', 'Luísa',
  'Julia', 'Lívia', 'Cecília', 'Lorena', 'Eloá', 'Liz', 'Beatriz', 'Maria Clara', 'Isadora', 'Mariana',
  'Yasmin', 'Ana', 'Letícia', 'Melissa', 'Nicole', 'Lara', 'Catarina', 'Clara', 'Antonella', 'Emanuelly',
  'Raquel', 'Vitória', 'Fernanda', 'Camila', 'Bruna', 'Carolina', 'Amanda', 'Larissa', 'Giovanna', 'Rebeca',
  'Thiago', 'Caio', 'Murilo', 'Pietro', 'Otávio', 'Augusto', 'Luan', 'Vinícius', 'Francisco', 'Caleb',
]

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Araújo', 'Melo', 'Barbosa', 'Rocha', 'Nascimento', 'Moreira',
  'Cardoso', 'Correia', 'Dias', 'Teixeira', 'Nunes', 'Campos', 'Monteiro', 'Batista', 'Vieira', 'Moura',
  'Freitas', 'Cavalcanti', 'Mendes', 'Lopes', 'Medeiros', 'Azevedo', 'Andrade', 'Ramos', 'Pinto', 'Cunha',
]

const tribeIds = [
  'tribe-1', 'tribe-2', 'tribe-3', 'tribe-4', 'tribe-5',
  'tribe-6', 'tribe-7', 'tribe-8', 'tribe-9',
]

const grades = ['6A', '7A', '8A']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function getCharacterForTribeAndPoints(tribeId: string, points: number): string {
  const tribeChars = characters
    .filter((c) => c.tribe_id === tribeId)
    .sort((a, b) => b.min_points - a.min_points)

  for (const char of tribeChars) {
    if (points >= char.min_points) {
      return char.id
    }
  }
  return tribeChars[tribeChars.length - 1].id
}

export function generateSeedStudents(): Student[] {
  const random = seededRandom(42)
  const students: Student[] = []

  // Pick 5 schools (one per state region)
  const selectedSchools = [
    schools[0],   // RS - Porto Alegre
    schools[20],  // SP - São Paulo
    schools[40],  // RJ - Rio de Janeiro
    schools[60],  // BA - Salvador
    schools[80],  // AM - Manaus
  ]

  let studentIndex = 0

  for (const school of selectedSchools) {
    for (let classIdx = 0; classIdx < 3; classIdx++) {
      const grade = grades[classIdx]
      const classroomId = `classroom-${school.id}-${grade}`

      for (let s = 0; s < 10; s++) {
        studentIndex++
        const firstIdx = Math.floor(random() * firstNames.length)
        const lastIdx = Math.floor(random() * lastNames.length)
        const name = `${firstNames[firstIdx]} ${lastNames[lastIdx]}`
        const tribeId = tribeIds[Math.floor(random() * tribeIds.length)]
        const totalPoints = Math.floor(random() * 1201)
        const redeemedPoints = Math.floor(random() * Math.min(totalPoints, 300))
        const availablePoints = totalPoints - redeemedPoints
        const characterId = getCharacterForTribeAndPoints(tribeId, totalPoints)

        const birthYear = 2010 + Math.floor(random() * 4)
        const birthMonth = 1 + Math.floor(random() * 12)
        const birthDay = 1 + Math.floor(random() * 28)

        const student: Student = {
          id: `student-${studentIndex}`,
          user_id: `user-${studentIndex}`,
          name,
          email: `aluno${studentIndex}@piramide.edu.br`,
          birth_date: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
          school_id: school.id,
          classroom_id: classroomId,
          tribe_id: tribeId,
          current_character_id: characterId,
          total_points: totalPoints,
          available_points: availablePoints,
          redeemed_points: redeemedPoints,
          last_action_date: '2026-03-28',
          role: 'student',
          parent_consent: true,
          parent_name: `Responsável de ${name.split(' ')[0]}`,
          parent_email: `responsavel${studentIndex}@email.com`,
          created_at: '2026-02-01T00:00:00Z',
        }

        students.push(student)
      }
    }
  }

  return students
}
