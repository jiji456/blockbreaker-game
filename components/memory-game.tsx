"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"

// Card types
type CardType = {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

// Game difficulty levels
type Difficulty = "easy" | "medium" | "hard"

const emojis = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"]

const difficultySettings = {
  easy: { pairs: 6, time: 60 },
  medium: { pairs: 8, time: 45 },
  hard: { pairs: 12, time: 30 },
}

export default function MemoryGame() {
  const [cards, setCards] = useState<CardType[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
  const [moves, setMoves] = useState<number>(0)
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")

  // Initialize game
  const initializeGame = (diff: Difficulty) => {
    setDifficulty(diff)
    const { pairs, time } = difficultySettings[diff]

    // Create pairs of cards
    const selectedEmojis = emojis.slice(0, pairs)
    const cardPairs = [...selectedEmojis, ...selectedEmojis]

    // Shuffle cards
    const shuffledCards = cardPairs
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))

    setCards(shuffledCards)
    setFlippedCards([])
    setMatchedPairs(0)
    setMoves(0)
    setTimeLeft(time)
    setGameOver(false)
    setGameStarted(true)
  }

  // Handle card click
  const handleCardClick = (id: number) => {
    // Ignore clicks if game is over or card is already flipped/matched
    if (gameOver || flippedCards.length >= 2 || cards[id].isFlipped || cards[id].isMatched) {
      return
    }

    // Flip the card
    const newCards = [...cards]
    newCards[id].isFlipped = true
    setCards(newCards)

    // Add to flipped cards
    const newFlippedCards = [...flippedCards, id]
    setFlippedCards(newFlippedCards)

    // Check for match if two cards are flipped
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1)

      const [firstId, secondId] = newFlippedCards
      if (cards[firstId].emoji === cards[secondId].emoji) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...cards]
          matchedCards[firstId].isMatched = true
          matchedCards[secondId].isMatched = true
          setCards(matchedCards)
          setMatchedPairs(matchedPairs + 1)
          setFlippedCards([])

          // Check if all pairs are matched
          if (matchedPairs + 1 === difficultySettings[difficulty].pairs) {
            setGameOver(true)
          }
        }, 500)
      } else {
        // No match
        setTimeout(() => {
          const unmatchedCards = [...cards]
          unmatchedCards[firstId].isFlipped = false
          unmatchedCards[secondId].isFlipped = false
          setCards(unmatchedCards)
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
        if (timeLeft === 1) {
          setGameOver(true)
        }
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameStarted, gameOver, timeLeft])

  // Determine grid columns based on difficulty
  const getGridCols = () => {
    switch (difficulty) {
      case "easy":
        return "grid-cols-3"
      case "medium":
        return "grid-cols-4"
      case "hard":
        return "grid-cols-4 md:grid-cols-6"
      default:
        return "grid-cols-3"
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {!gameStarted ? (
        <div className="flex flex-col items-center space-y-4 p-6 bg-slate-100 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">เลือกระดับความยาก</h2>
          <Button onClick={() => initializeGame("easy")} className="w-full py-6 text-lg" variant="outline">
            ง่าย (6 คู่)
          </Button>
          <Button onClick={() => initializeGame("medium")} className="w-full py-6 text-lg" variant="outline">
            ปานกลาง (8 คู่)
          </Button>
          <Button onClick={() => initializeGame("hard")} className="w-full py-6 text-lg" variant="outline">
            ยาก (12 คู่)
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center w-full mb-4 p-4 bg-slate-100 rounded-lg">
            <div className="text-lg font-medium">เวลา: {timeLeft} วินาที</div>
            <div className="text-lg font-medium">
              คะแนน: {matchedPairs} / {difficultySettings[difficulty].pairs}
            </div>
            <div className="text-lg font-medium">ครั้ง: {moves}</div>
          </div>

          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
              <div className="bg-white p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">
                  {matchedPairs === difficultySettings[difficulty].pairs ? "ยินดีด้วย! คุณชนะ 🎉" : "หมดเวลา! 😢"}
                </h2>
                <p className="mb-4">
                  คุณจับคู่ได้ {matchedPairs} คู่ จากทั้งหมด {difficultySettings[difficulty].pairs} คู่
                </p>
                <p className="mb-6">จำนวนครั้งที่เล่น: {moves}</p>
                <div className="flex space-x-4 justify-center">
                  <Button onClick={() => initializeGame(difficulty)}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    เล่นอีกครั้ง
                  </Button>
                  <Button variant="outline" onClick={() => setGameStarted(false)}>
                    เปลี่ยนระดับ
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className={`grid ${getGridCols()} gap-4 w-full`}>
            {cards.map((card) => (
              <Card
                key={card.id}
                className={`aspect-square flex items-center justify-center text-4xl md:text-5xl cursor-pointer transition-all duration-300 ${
                  card.isFlipped || card.isMatched ? "bg-white" : "bg-slate-700"
                } ${card.isMatched ? "opacity-50" : "opacity-100"}`}
                onClick={() => handleCardClick(card.id)}
              >
                {card.isFlipped || card.isMatched ? card.emoji : ""}
              </Card>
            ))}
          </div>

          {!gameOver && (
            <Button variant="outline" className="mt-6" onClick={() => setGameStarted(false)}>
              กลับไปเลือกระดับ
            </Button>
          )}
        </>
      )}
    </div>
  )
}
