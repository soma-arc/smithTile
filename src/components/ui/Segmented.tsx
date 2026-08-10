/** A segmented radio control (used for language and parameter mode). */

import type { CSSProperties } from 'react';

export type SegmentedOption<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
    name,
    value,
    options,
    onChange,
    containerStyle,
    optionStyle,
}: {
    name: string;
    value: T;
    options: readonly SegmentedOption<T>[];
    onChange: (value: T) => void;
    containerStyle?: CSSProperties;
    optionStyle?: CSSProperties;
}) {
    return (
        <div className="seg" style={containerStyle}>
            {options.map((o) => (
                <label className="seg-opt" key={o.value} style={optionStyle}>
                    <input
                        type="radio"
                        name={name}
                        checked={value === o.value}
                        onChange={() => onChange(o.value)}
                    />
                    <span>{o.label}</span>
                </label>
            ))}
        </div>
    );
}
