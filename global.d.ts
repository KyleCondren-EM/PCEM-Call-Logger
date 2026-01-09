/* eslint-disable @typescript-eslint/no-explicit-any */

// Web Awesome Custom Element Type Definitions (CDN Version)
// These provide TypeScript support for Web Awesome web components

interface WebAwesomeBaseProps {
	className?: string;
	style?: React.CSSProperties;
	slot?: string;
	children?: React.ReactNode;
}

interface WaIconProps extends WebAwesomeBaseProps {
	name?: string;
	family?: 'classic' | 'brands';
	variant?: 'thin' | 'light' | 'regular' | 'solid';
	src?: string;
	label?: string;
}

interface WaInputProps extends WebAwesomeBaseProps {
	'label'?: string;
	'type'?: string;
	'value'?: string;
	'placeholder'?: string;
	'required'?: boolean;
	'disabled'?: boolean;
	'readonly'?: boolean;
	'minlength'?: number;
	'maxlength'?: number;
	'min'?: number | string;
	'max'?: number | string;
	'step'?: number | string;
	'pattern'?: string;
	'size'?: 'small' | 'medium' | 'large';
	'password-toggle'?: boolean;
	'autocomplete'?: string;
	'oninput'?: (e: Event) => void;
	'onchange'?: (e: Event) => void;
}

interface WaButtonProps extends WebAwesomeBaseProps {
	'type'?: 'button' | 'submit' | 'reset';
	'variant'?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
	'appearance'?: 'accent' | 'filled' | 'outlined' | 'filled-outlined' | 'plain';
	'size'?: 'small' | 'medium' | 'large';
	'disabled'?: boolean;
	'loading'?: boolean;
	'with-caret'?: boolean;
	'href'?: string;
	'target'?: '_blank' | '_parent' | '_self' | '_top';
	'download'?: string;
}

interface WaCardProps extends WebAwesomeBaseProps {
	// Card component props
}

interface WaCalloutProps extends WebAwesomeBaseProps {
	variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
	open?: boolean;
	closable?: boolean;
}

interface WaTextareaProps extends WebAwesomeBaseProps {
	label?: string;
	value?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	readonly?: boolean;
	rows?: number;
	resize?: 'none' | 'vertical' | 'auto';
	size?: 'small' | 'medium' | 'large';
	oninput?: (e: Event) => void;
	onchange?: (e: Event) => void;
}

interface WaSpinnerProps extends WebAwesomeBaseProps {
	size?: 'small' | 'medium' | 'large';
}

interface WaBadgeProps extends WebAwesomeBaseProps {
	variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
	pill?: boolean;
	pulse?: boolean;
}

interface WaAvatarProps extends WebAwesomeBaseProps {
	image?: string;
	label?: string;
	initials?: string;
	loading?: 'eager' | 'lazy';
	shape?: 'circle' | 'square' | 'rounded';
}

interface WaDividerProps extends WebAwesomeBaseProps {
	vertical?: boolean;
}

interface WaTooltipProps extends WebAwesomeBaseProps {
	content?: string;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
	disabled?: boolean;
	distance?: number;
	open?: boolean;
	skidding?: number;
	trigger?: string;
	hoist?: boolean;
}

interface WaDropdownProps extends WebAwesomeBaseProps {
	placement?:
		| 'top'
		| 'top-start'
		| 'top-end'
		| 'bottom'
		| 'bottom-start'
		| 'bottom-end'
		| 'left'
		| 'left-start'
		| 'left-end'
		| 'right'
		| 'right-start'
		| 'right-end';
	open?: boolean;
	disabled?: boolean;
	distance?: number;
	skidding?: number;
	hoist?: boolean;
	size?: 'small' | 'medium' | 'large';
	onWaSelect?: (e: CustomEvent) => void;
	onWaShow?: (e: CustomEvent) => void;
	onWaHide?: (e: CustomEvent) => void;
}

interface WaDropdownItemProps extends WebAwesomeBaseProps {
	value?: string;
	disabled?: boolean;
	checked?: boolean;
	type?: 'normal' | 'checkbox';
	variant?: 'default' | 'danger';
	onClick?: (e: Event) => void;
}

interface WaMenuProps extends WebAwesomeBaseProps {
	// Menu container props
}

interface WaMenuItemProps extends WebAwesomeBaseProps {
	value?: string;
	disabled?: boolean;
	checked?: boolean;
	type?: 'normal' | 'checkbox';
	onClick?: (e: Event) => void;
}

declare namespace JSX {
	interface IntrinsicElements {
		'wa-icon': WaIconProps & React.HTMLAttributes<HTMLElement>;
		'wa-input': WaInputProps & React.HTMLAttributes<HTMLElement>;
		'wa-button': WaButtonProps & React.HTMLAttributes<HTMLElement>;
		'wa-card': WaCardProps & React.HTMLAttributes<HTMLElement>;
		'wa-callout': WaCalloutProps & React.HTMLAttributes<HTMLElement>;
		'wa-textarea': WaTextareaProps & React.HTMLAttributes<HTMLElement>;
		'wa-spinner': WaSpinnerProps & React.HTMLAttributes<HTMLElement>;
		'wa-badge': WaBadgeProps & React.HTMLAttributes<HTMLElement>;
		'wa-avatar': WaAvatarProps & React.HTMLAttributes<HTMLElement>;
		'wa-divider': WaDividerProps & React.HTMLAttributes<HTMLElement>;
		'wa-tooltip': WaTooltipProps & React.HTMLAttributes<HTMLElement>;
		'wa-dropdown': WaDropdownProps & React.HTMLAttributes<HTMLElement>;
		'wa-dropdown-item': WaDropdownItemProps & React.HTMLAttributes<HTMLElement>;
		'wa-menu': WaMenuProps & React.HTMLAttributes<HTMLElement>;
		'wa-menu-item': WaMenuItemProps & React.HTMLAttributes<HTMLElement>;
	}
}
