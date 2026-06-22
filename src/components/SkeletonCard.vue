<template>
  <article class="skeleton-card" aria-hidden="true">
    <div class="skeleton-card__browser">
      <span></span><span></span><span></span>
    </div>
    <div class="skeleton-card__cover shimmer"></div>
    <div class="skeleton-card__body">
      <div class="skeleton-card__identity shimmer"></div>
      <div class="skeleton-card__title shimmer"></div>
      <div class="skeleton-card__line shimmer"></div>
      <div class="skeleton-card__line skeleton-card__line--short shimmer"></div>
      <div class="skeleton-card__tags">
        <i class="shimmer"></i><i class="shimmer"></i><i class="shimmer"></i>
      </div>
    </div>
  </article>
</template>

<style scoped>
.skeleton-card {
  overflow: hidden;
  min-height: 470px;
  border: 1px solid var(--line);
  background: var(--paper-raised);
}

.skeleton-card__browser {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  padding-inline: 0.65rem;
}

.skeleton-card__browser span {
  width: 5px;
  height: 5px;
  border: 1px solid var(--line);
}

.skeleton-card__cover {
  aspect-ratio: 16 / 9;
  border-bottom: 1px solid var(--line);
}

.skeleton-card__body {
  padding: 1.2rem;
}

.skeleton-card__identity {
  width: 62%;
  height: 30px;
}

.skeleton-card__title {
  width: 76%;
  height: 28px;
  margin-top: 1.25rem;
}

.skeleton-card__line {
  width: 100%;
  height: 10px;
  margin-top: 1.35rem;
}

.skeleton-card__line--short {
  width: 68%;
  margin-top: 0.55rem;
}

.skeleton-card__tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.skeleton-card__tags i {
  width: 55px;
  height: 25px;
}

.shimmer {
  background:
    linear-gradient(105deg, transparent 35%, color-mix(in srgb, var(--paper-raised) 75%, transparent) 50%, transparent 65%),
    var(--skeleton);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
