/** A small colored label chip. */

import type { CSSProperties } from 'react';

export function Tag({ label, style }: { label: string; style?: CSSProperties }) {
    return (
        <span className="tag" style={style}>
            {label}
        </span>
    );
}
