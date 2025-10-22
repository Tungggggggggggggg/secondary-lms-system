export default function FloatingElements() {
    const items = [
      { emoji: '📚', className: 'top-[10%] left-[15%] animate-float delay-[0s]' },
      { emoji: '🗺️', className: 'top-[20%] right-[20%] animate-float delay-[2s]' },
      { emoji: '✏️', className: 'bottom-[30%] left-[10%] animate-float delay-[4s]' },
      { emoji: '📖', className: 'top-[60%] right-[15%] animate-float delay-[1s]' },
      { emoji: '🌍', className: 'bottom-[20%] right-[10%] animate-float delay-[3s]' },
    ];
  
    return (
      <div className="absolute inset-0 pointer-events-none z-0">
        {items.map((item, i) => (
          <div
            key={i}
            className={`absolute text-3xl opacity-10 ${item.className}`}
            style={{ animationDuration: '6s', animationIterationCount: 'infinite' }}
          >
            {item.emoji}
          </div>
        ))}
      </div>
    );
  }
  