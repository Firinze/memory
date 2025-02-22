"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, Star, Sun, Moon, Cloud, Flower2 } from "lucide-react"
import { toast } from "sonner"

type GameMode = "normal" | "chrono"
type Difficulty = "facile" | "moyen" | "difficile" | "extreme"

type MemoryCard = {
  id: number
  icon: React.ElementType
  isMatched: boolean
  color: string
}

type Score = {
  mode: GameMode
  difficulty: Difficulty
  score: number
  time?: number
}

const DIFFICULTY_CONFIG = {
  facile: { pairs: 6, time: 120, baseScore: 100 },
  moyen: { pairs: 8, time: 90, baseScore: 200 },
  difficile: { pairs: 10, time: 60, baseScore: 300 },
  extreme: { pairs: 12, time: 45, baseScore: 400 },
}

const ICONS = [Heart, Star, Sun, Moon, Cloud, Flower2]
const COLORS = [
  "text-rose-400",
  "text-amber-400",
  "text-yellow-400",
  "text-purple-400",
  "text-sky-400",
  "text-emerald-400",
]

const createCards = (difficulty: Difficulty) => {
  const pairs = DIFFICULTY_CONFIG[difficulty].pairs
  const cards: MemoryCard[] = []

  for (let i = 0; i < pairs; i++) {
    const icon = ICONS[i % ICONS.length]
    const color = COLORS[i % COLORS.length]
    cards.push({ id: i * 2, icon, color, isMatched: false }, { id: i * 2 + 1, icon, color, isMatched: false })
  }

  return cards.sort(() => Math.random() - 0.5)
}

const calculateScore = (mode: GameMode, difficulty: Difficulty, matches: number, timeLeft: number) => {
  const { baseScore, time } = DIFFICULTY_CONFIG[difficulty]
  const matchScore = matches * baseScore
  if (mode === "normal") return matchScore
  const timeBonus = Math.floor((timeLeft / time) * baseScore * matches)
  return matchScore + timeBonus
}

export default function MemoryGame() {
  const [gameState, setGameState] = useState<"setup" | "preview" | "playing" | "finished">("setup")
  const [mode, setMode] = useState<GameMode>("normal")
  const [difficulty, setDifficulty] = useState<Difficulty>("facile")
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [bestScores, setBestScores] = useState<Score[]>([])

  useEffect(() => {
    const storedBestScores = localStorage.getItem("bestScores")
    if (storedBestScores) {
      setBestScores(JSON.parse(storedBestScores))
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (gameState === "preview") {
      timer = setTimeout(() => {
        setGameState("playing")
        setFlippedIndexes([])
      }, 2000)
    } else if (gameState === "playing" && mode === "chrono" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((time) => time - 1), 1000)
    } else if (timeLeft === 0 && mode === "chrono" && gameState === "playing") {
      endGame(false)
    }
    return () => clearInterval(timer)
  }, [timeLeft, gameState, mode])

  const startGame = () => {
    const newCards = createCards(difficulty)
    setCards(newCards)
    setFlippedIndexes([...Array(newCards.length).keys()])
    setMatches(0)
    setIsChecking(false)
    setTimeLeft(mode === "chrono" ? DIFFICULTY_CONFIG[difficulty].time : 0)
    setGameState("preview")
    setScore(0)
  }

  const endGame = (isWin: boolean) => {
    setGameState("finished")
    const finalScore = calculateScore(mode, difficulty, matches, timeLeft)
    setScore(finalScore)

    const newBestScores = [...bestScores]
    const scoreIndex = newBestScores.findIndex((s) => s.mode === mode && s.difficulty === difficulty)
    if (scoreIndex === -1 || newBestScores[scoreIndex].score < finalScore) {
      if (scoreIndex !== -1) {
        newBestScores[scoreIndex] = {
          mode,
          difficulty,
          score: finalScore,
          time: mode === "chrono" ? timeLeft : undefined,
        }
      } else {
        newBestScores.push({ mode, difficulty, score: finalScore, time: mode === "chrono" ? timeLeft : undefined })
      }
      setBestScores(newBestScores)
      localStorage.setItem("bestScores", JSON.stringify(newBestScores))
    }

    if (isWin) {
      toast("🎉 Félicitations ! Vous avez trouvé toutes les paires ! 🎈", {
        className: "bg-purple-900 text-purple-100 border-purple-700",
      })
    } else {
      toast("⏰ Temps écoulé ! Meilleure chance la prochaine fois !", {
        className: "bg-red-900 text-red-100 border-red-700",
      })
    }
  }

  const handleCardClick = (clickedIndex: number) => {
    if (
      isChecking ||
      cards[clickedIndex].isMatched ||
      flippedIndexes.includes(clickedIndex) ||
      flippedIndexes.length === 2
    )
      return

    const newFlipped = [...flippedIndexes, clickedIndex]
    setFlippedIndexes(newFlipped)

    if (newFlipped.length === 2) {
      setIsChecking(true)
      const [firstIndex, secondIndex] = newFlipped
      const firstCard = cards[firstIndex]
      const secondCard = cards[secondIndex]

      if (firstCard.icon === secondCard.icon) {
        setTimeout(() => {
          setCards(
            cards.map((card, index) =>
              index === firstIndex || index === secondIndex ? { ...card, isMatched: true } : card,
            ),
          )
          setFlippedIndexes([])
          setMatches((m) => {
            const newMatches = m + 1
            if (newMatches === cards.length / 2) {
              endGame(true)
            }
            return newMatches
          })
          setIsChecking(false)
        }, 500)
      } else {
        setTimeout(() => {
          setFlippedIndexes([])
          setIsChecking(false)
        }, 1000)
      }
    }
  }

  const getGridColumns = () => {
    const pairs = DIFFICULTY_CONFIG[difficulty].pairs
    if (pairs <= 6) return "grid-cols-3"
    if (pairs <= 8) return "grid-cols-4"
    return "grid-cols-4 md:grid-cols-5"
  }

  if (gameState === "setup") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 text-transparent bg-clip-text text-center">
          Jeu de Mémoire
        </h1>
        <div className="space-y-4 w-full max-w-xs">
          <Select onValueChange={(value: GameMode) => setMode(value)}>
            <SelectTrigger className="w-full bg-white text-black">
              <SelectValue placeholder="Sélectionner le mode de jeu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="chrono">Chrono</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value: Difficulty) => setDifficulty(value)}>
            <SelectTrigger className="w-full bg-white text-black">
              <SelectValue placeholder="Sélectionner la difficulté" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facile">Facile</SelectItem>
              <SelectItem value="moyen">Moyen</SelectItem>
              <SelectItem value="difficile">Difficile</SelectItem>
              <SelectItem value="extreme">Extrême</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startGame} className="w-full max-w-xs">
          Commencer le jeu
        </Button>
        {bestScores.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h2 className="text-2xl font-semibold text-indigo-300 mb-4">Meilleurs scores</h2>
            <div className="space-y-2">
              {bestScores.map((score, index) => (
                <div key={index} className="flex justify-between items-center bg-indigo-900/30 p-2 rounded">
                  <span className="text-indigo-200">
                    {score.mode} - {score.difficulty}
                  </span>
                  <span className="text-indigo-300 font-semibold">
                    {score.score} {score.time !== undefined && `(${score.time}s)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6 md:space-y-8 bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
      <div className="text-center space-y-2 md:space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 text-transparent bg-clip-text">
          Jeu de Mémoire
        </h1>
        <p className="text-indigo-200">
          Paires trouvées : {matches} sur {cards.length / 2}
        </p>
        {mode === "chrono" && <p className="text-indigo-200">Temps restant : {timeLeft} secondes</p>}
        <p className="text-indigo-300 font-semibold">Score : {calculateScore(mode, difficulty, matches, timeLeft)}</p>
      </div>

      <div
        className={`grid ${getGridColumns()} gap-2 sm:gap-4 p-4 sm:p-6 rounded-xl bg-indigo-950/50 backdrop-blur-sm`}
      >
        {cards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <motion.div
              key={card.id}
              initial={{ rotateY: 0 }}
              animate={{
                rotateY: card.isMatched || flippedIndexes.includes(index) ? 180 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="perspective-1000"
            >
              <Card
                className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 cursor-pointer transform-style-3d transition-all duration-300 ${
                  card.isMatched
                    ? "bg-indigo-900/50 border-indigo-400/50"
                    : flippedIndexes.includes(index)
                      ? "bg-indigo-800/50 border-indigo-500/50"
                      : "bg-indigo-950 border-indigo-800 hover:border-indigo-600 hover:bg-indigo-900/80"
                }`}
                onClick={() => gameState === "playing" && handleCardClick(index)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-500/5 to-white/5" />
                <AnimatePresence>
                  {(card.isMatched || flippedIndexes.includes(index)) && (
                    <motion.div
                      initial={{ opacity: 0, rotateY: 180 }}
                      animate={{ opacity: 1, rotateY: 180 }}
                      exit={{ opacity: 0, rotateY: 180 }}
                      className="absolute inset-0 flex items-center justify-center backface-hidden"
                    >
                      <IconComponent
                        className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${
                          card.isMatched
                            ? `${card.color} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`
                            : card.color
                        }`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {gameState === "finished" && (
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-indigo-300">Score final : {score}</p>
          <Button
            onClick={() => setGameState("setup")}
            variant="outline"
            size="lg"
            className="bg-indigo-950 border-indigo-700 hover:bg-indigo-900 hover:border-indigo-500 text-indigo-200 hover:text-indigo-100"
          >
            Rejouer
          </Button>
        </div>
      )}
    </div>
  )
}

