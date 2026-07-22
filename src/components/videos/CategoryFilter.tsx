"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  label: string
}

interface CategoryFilterProps {
  categories: Category[]
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Video categories">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onCategoryChange("all")}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 border",
          activeCategory === "all"
            ? "gold-gradient-bg text-space-deep shadow-md gold-shadow border-transparent"
            : "bg-space-mid/20 text-muted-foreground hover:text-gold-light hover:border-gold-dim/30 border-border/20"
        )}
        aria-pressed={activeCategory === "all"}
      >
        All
      </motion.button>
      {categories.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 border",
            activeCategory === category.id
              ? "gold-gradient-bg text-space-deep shadow-md gold-shadow border-transparent"
              : "bg-space-mid/20 text-muted-foreground hover:text-gold-light hover:border-gold-dim/30 border-border/20"
          )}
          aria-pressed={activeCategory === category.id}
        >
          {category.label}
        </motion.button>
      ))}
    </div>
  )
}
