<script setup>
defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  activeCategory: {
    type: String,
    default: 'Todos',
  },
})

defineEmits(['select'])
</script>

<template>
  <nav class="category-strip" aria-label="Categorias do catálogo">
    <div class="category-strip__inner">
      <button
        v-for="(category, index) in categories"
        :key="category.name"
        type="button"
        :class="{ active: activeCategory === category.name }"
        :aria-pressed="activeCategory === category.name"
        @click="$emit('select', category.name)"
      >
        <span class="category-strip__index">{{ String(index).padStart(2, '0') }}</span>
        <span>{{ category.name }}</span>
        <strong>{{ String(category.count).padStart(2, '0') }}</strong>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.category-strip {
  overflow: hidden;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 96%, transparent);
}

.category-strip__inner {
  display: flex;
  max-width: 1440px;
  margin: 0 auto;
  overflow-x: auto;
  border-inline: 1px solid var(--line);
  scrollbar-width: none;
}

.category-strip__inner::-webkit-scrollbar {
  display: none;
}

button {
  display: inline-flex;
  min-height: 58px;
  flex: 0 0 auto;
  cursor: pointer;
  align-items: center;
  gap: 0.55rem;
  border: 0;
  border-right: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  padding: 0 1rem;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background 200ms ease, color 200ms ease;
}

button:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

button.active {
  background: var(--accent);
  color: white;
}

.category-strip__index {
  color: var(--accent);
}

button.active .category-strip__index {
  color: rgba(255, 255, 255, 0.72);
}

strong {
  display: grid;
  min-width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--line);
  background: var(--paper-raised);
  color: var(--ink);
  font-size: 0.55rem;
}

button.active strong {
  border-color: rgba(255, 255, 255, 0.45);
  background: transparent;
  color: white;
}
</style>
