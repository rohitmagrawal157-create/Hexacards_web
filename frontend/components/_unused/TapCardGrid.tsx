"use client";

import { startTransition, useState } from "react";
import TapCard from "./TapCard";
import type { UserCard } from "./types";

type TapCardGridProps = {
  users: UserCard[];
};

export default function TapCardGrid({ users }: TapCardGridProps) {
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    startTransition(() => {
      setFlippedId((current) => (current === id ? null : id));
    });
  };

  return (
    <section
      aria-label="Team directory cards"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {users.map((user, index) => (
        <TapCard
          key={user.id}
          user={user}
          index={index}
          flipped={flippedId === user.id}
          onToggle={handleToggle}
        />
      ))}
    </section>
  );
}
