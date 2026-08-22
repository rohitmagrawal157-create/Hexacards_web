"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  motion,
  type PanInfo,
  type Transition,
} from "framer-motion";

const PERSPECTIVE = 1000;
const DEPTH_SPACING = 12;

export type StackImage = {
  src: string;
  alt?: string;
};

export const DEFAULT_STACK_IMAGES: StackImage[] = [
  { src: "/stack/card-1.svg", alt: "Aarav Mehta — Founder digital business card" },
  { src: "/stack/card-2.svg", alt: "Ava Chen — Product designer profile card" },
  { src: "/stack/card-3.svg", alt: "Marcus Reed — NFC engineer card" },
  { src: "/stack/card-4.svg", alt: "Sofia Alvarez — Google review card" },
  { src: "/stack/card-5.svg", alt: "Jonah Park — Team edition card" },
];

type CardItem = {
  id: number;
  content: string;
  imageIndex: number;
};

type CardStackProps = {
  images?: StackImage[];
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  swipeThreshold?: number;
  tiltAngle?: number;
  tiltAngleStart?: number;
  xOffset?: number;
  transition?: Transition;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  /** Auto-cycle top card to back. Default 2000ms. Set 0 to disable. */
  autoRotateMs?: number;
};

export default function CardStack({
  images = DEFAULT_STACK_IMAGES,
  cardWidth = 260,
  cardHeight = 360,
  cardRadius = 10,
  swipeThreshold = 40,
  tiltAngle = -22,
  tiltAngleStart = -3,
  xOffset = 70,
  transition = { type: "spring", stiffness: 280, damping: 28 },
  className,
  style,
  interactive = true,
  autoRotateMs = 2000,
}: CardStackProps) {
  const imgs =
    Array.isArray(images) && images.length > 0
      ? images
      : DEFAULT_STACK_IMAGES;
  const actualCardCount = Math.min(Math.max(imgs.length, 1), 5);

  const [cards, setCards] = useState<CardItem[]>(() =>
    Array.from({ length: actualCardCount }, (_, i) => ({
      id: i + 1,
      content: `Card ${i + 1}`,
      imageIndex: i,
    })),
  );

  const [isPressed, setIsPressed] = useState(false);
  const [shouldReturnToCenter, setShouldReturnToCenter] = useState(false);

  const rotateTopCard = () => {
    setCards((prevCards) => {
      if (prevCards.length < 2) return prevCards;
      const [topCard, ...restCards] = prevCards;
      return [...restCards, topCard];
    });
  };

  // Auto-advance card positions every N ms (pauses while dragging)
  useEffect(() => {
    if (!interactive || !autoRotateMs || autoRotateMs < 1) return;
    if (isPressed) return;

    const id = window.setInterval(() => {
      rotateTopCard();
    }, autoRotateMs);

    return () => window.clearInterval(id);
  }, [interactive, autoRotateMs, isPressed]);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsPressed(false);
    const { offset } = info;
    const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
    if (distance > swipeThreshold) {
      rotateTopCard();
    } else {
      setShouldReturnToCenter(true);
      window.setTimeout(() => setShouldReturnToCenter(false), 400);
    }
  };

  const getCardStyle = (index: number) => {
    const totalCards = cards.length;
    const stackOffset = index * 10;
    const scaleValue = 1 - index * 0.045;
    const rotationValue =
      totalCards > 1
        ? tiltAngleStart +
          (index / (totalCards - 1)) * (tiltAngle - tiltAngleStart)
        : tiltAngleStart;
    const xOffsetValue =
      totalCards > 1 ? (index / (totalCards - 1)) * xOffset : 0;
    const depthOffset = index * DEPTH_SPACING;
    const isTopCard = index === 0;
    const shouldReturn = isTopCard && shouldReturnToCenter;

    return {
      zIndex: cards.length - index,
      scale: scaleValue,
      x: shouldReturn ? 0 : xOffsetValue,
      y: shouldReturn ? 0 : -stackOffset,
      rotate: shouldReturn ? 0 : rotationValue,
      z: -depthOffset,
      opacity: 1,
    };
  };

  const radiusPx =
    (cardRadius / 20) * (Math.min(cardWidth, cardHeight) / 2);

  return (
    <div
      className={className}
      style={{
        ...style,
        width: "100%",
        minHeight: cardHeight + 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        perspective: `${PERSPECTIVE}px`,
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "relative",
          width: cardWidth,
          height: cardHeight,
          transformStyle: "preserve-3d",
        }}
      >
        {cards.map((card, index) => {
          const isTopCard = index === 0;
          const cardStyle = getCardStyle(index);
          const cardImage = imgs[card.imageIndex % imgs.length];
          const canDrag = interactive && isTopCard;

          return (
            <motion.div
              key={card.id}
              drag={canDrag}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.65}
              dragMomentum={false}
              dragTransition={{
                bounceStiffness: 300,
                bounceDamping: 20,
              }}
              onPointerDown={
                canDrag
                  ? () => {
                      setIsPressed(true);
                    }
                  : undefined
              }
              onPointerUp={canDrag ? () => setIsPressed(false) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
              animate={cardStyle}
              initial={false}
              transition={{
                x: transition,
                y: transition,
                rotate: transition,
                scale: transition,
                zIndex: { duration: 0.25, ease: "easeOut" },
                z: { duration: 0.25, ease: "easeOut" },
              }}
              whileDrag={{
                scale: 1.04,
                rotate: tiltAngleStart,
                zIndex: 1000,
                cursor: "grabbing",
              }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: radiusPx,
                overflow: "hidden",
                cursor: canDrag
                  ? isPressed
                    ? "grabbing"
                    : "grab"
                  : "default",
                userSelect: "none",
                touchAction: "none",
                boxShadow:
                  "0 20px 44px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08)",
                backgroundColor: "#111827",
                willChange: "transform",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardImage.src}
                alt={cardImage.alt ?? card.content}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  pointerEvents: "none",
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
