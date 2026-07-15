"use client"

import { motion } from "framer-motion"

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
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
          activeCategory === "all"
            ? "bg-secondary text-background shadow-md shadow-secondary/20"
            : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-light border border-border/50"
        }`}
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
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            activeCategory === category.id
              ? "bg-secondary text-background shadow-md shadow-secondary/20"
              : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-light border border-border/50"
          }`}
          aria-pressed={activeCategory === category.id}
        >
          {category.label}
        </motion.button>
      ))}
    </div>
  )
}
