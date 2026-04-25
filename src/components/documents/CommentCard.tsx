"use client";

import Image from "next/image";
import { Lock, X } from "lucide-react";

export interface Comment {
  id: string;
  content: string;
  quotedText: string | null;
  sectionType: string | null;
  isPrivate: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface Props {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  formatDate: (iso: string) => string;
}

export function CommentCard({ comment, currentUserId, onDelete, formatDate }: Props) {
  const isOwn = comment.author.id === currentUserId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 group">
      {/* Quoted text */}
      {comment.quotedText && (
        <div className="bg-gray-50 border-l-4 border-gray-300 pl-3 py-1.5 rounded-r-lg">
          {comment.sectionType && (
            <p className="text-xs text-gray-500 font-medium mb-0.5">{comment.sectionType}</p>
          )}
          <p className="text-xs text-gray-600 italic line-clamp-2">&ldquo;{comment.quotedText}&rdquo;</p>
        </div>
      )}

      <p className="text-sm text-gray-800">{comment.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {comment.author.image ? (
            <Image src={comment.author.image} alt="" width={20} height={20} className="rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {(comment.author.name ?? "?")[0]}
            </div>
          )}
          <span className="text-xs text-gray-500">
            {comment.author.name}
            {comment.author.username && (
              <span className="text-gray-400"> @{comment.author.username}</span>
            )}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
          {comment.isPrivate && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Lock className="w-3 h-3" /> privado
            </span>
          )}
        </div>
        {isOwn && (
          <button
            onClick={() => onDelete(comment.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
