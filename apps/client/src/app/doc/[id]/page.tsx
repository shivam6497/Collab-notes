"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface Props {
  params: Promise<{ id: string }>;
}

export default function DocPage({ params }: Props) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-gray-950">
      <Editor docId={id} />
    </div>
  );
}