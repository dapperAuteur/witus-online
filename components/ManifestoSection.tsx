interface ManifestoSectionProps {
  quote: string;
  attribution?: string;
}

export default function ManifestoSection({ quote, attribution }: ManifestoSectionProps) {
  return (
    <div className="border-l-4 border-slate-600 pl-8 py-2 my-12">
      <p className="text-2xl sm:text-3xl font-light text-slate-200 leading-snug italic">
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <p className="mt-4 text-sm text-slate-500">&mdash; {attribution}</p>
      )}
    </div>
  );
}
