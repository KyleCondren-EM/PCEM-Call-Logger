'use client';

import { useEffect, useRef, useState } from 'react';
import SlimSelect from 'slim-select';

// Default reasons from PCEM
const DEFAULT_REASONS = [
	'EM Data/Technical',
	'Health Care Facility',
	'Hurricane Info Request',
	'Incident Related',
	'Logistics',
	'Non-EM Related',
	'Utilities',
	'Other',
];

interface ReasonSelectProps {
	value: string[];
	onChange: (value: string[]) => void;
	required?: boolean;
}

export default function ReasonSelect({ value, onChange, required }: ReasonSelectProps) {
	const selectRef = useRef<HTMLSelectElement>(null);
	const slimSelectRef = useRef<SlimSelect | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted || !selectRef.current) return;

		// Initialize SlimSelect
		slimSelectRef.current = new SlimSelect({
			select: selectRef.current,
			settings: {
				placeholderText: 'Select reasons...',
				searchPlaceholder: 'Search or add custom...',
				searchText: 'No results found',
				searchHighlight: true,
				closeOnSelect: false,
				allowDeselect: true,
				hideSelected: false,
				showSearch: true,
				maxValuesShown: 20,
			},
			events: {
				afterChange: (newVal) => {
					const selected = newVal.map((v) => v.value as string);
					onChange(selected);
				},
				addable: (value: string) => {
					// Allow adding custom options
					return {
						text: value,
						value: value,
					};
				},
			},
		});

		return () => {
			if (slimSelectRef.current) {
				slimSelectRef.current.destroy();
			}
		};
	}, [mounted]);

	// Sync external value changes to SlimSelect
	useEffect(() => {
		if (slimSelectRef.current && mounted) {
			const currentSelected = slimSelectRef.current.getSelected();
			const valueSet = new Set(value);
			const currentSet = new Set(currentSelected);

			// Only update if there's a difference
			if (value.length !== currentSelected.length || !value.every((v) => currentSet.has(v))) {
				slimSelectRef.current.setSelected(value, false);
			}
		}
	}, [value, mounted]);

	if (!mounted) {
		return (
			<div>
				<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
					Reason Tags {required && <span style={{ color: 'var(--color-primary-red)' }}>*</span>}
				</label>
				<div
					className='h-[34px] rounded'
					style={{
						border: '1px solid var(--color-border-light)',
						backgroundColor: 'var(--color-bg-primary)',
					}}
				/>
			</div>
		);
	}

	return (
		<div className='reason-select-wrapper'>
			<label className='block text-sm font-medium mb-1' style={{ color: 'var(--color-text-secondary)' }}>
				Reason Tags {required && value.length === 0 && <span style={{ color: 'var(--color-primary-red)' }}>*</span>}
			</label>

			<select ref={selectRef} multiple required={required && value.length === 0}>
				{DEFAULT_REASONS.map((reason) => (
					<option key={reason} value={reason}>
						{reason}
					</option>
				))}
			</select>
		</div>
	);
}
