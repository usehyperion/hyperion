import { SortClassesOptions } from "eslint-plugin-perfectionist";

export const sortClasses: SortClassesOptions[number] = {
	type: "unsorted",
	groups: [
		// public readonly [key: string]: unknown;
		"readonly-index-signature",
		// public [key: string]: unknown;
		"index-signature",
		// public static readonly VERSION = 1;
		"static-readonly-property",
		// public static count = 0;
		// public static accessor flag = false;
		// public static reset = () => {};
		["static-property", "static-accessor-property", "static-function-property"],
		// protected static readonly SECRET = "s";
		"protected-static-readonly-property",
		// protected static registry = new Map();
		// protected static accessor enabled = true;
		// protected static register = () => {};
		[
			"protected-static-property",
			"protected-static-accessor-property",
			"protected-static-function-property",
		],
		// static readonly #instances = new Set();
		"private-static-readonly-property",
		// static #nextId = 0;
		// static accessor #ready = false;
		// static #bump = () => {};
		[
			"private-static-property",
			"private-static-accessor-property",
			"private-static-function-property",
		],
		// public static get total() {}
		// public static set total(value) {}
		["static-get-method", "static-set-method"],
		// protected static get registered() {}
		["protected-static-get-method", "protected-static-set-method"],
		// static get #id() {}
		["private-static-get-method", "private-static-set-method"],
		// public static create() {}
		"static-method",
		// protected static register() {}
		"protected-static-method",
		// static #bump() {}
		"private-static-method",
		// static { ... }
		"static-block",
		// public abstract name: string;
		// public abstract accessor label: string;
		// public abstract onSelect: () => void;
		// public readonly id = 1;
		// public readonly onClick = () => {};
		// public override readonly id = 1;
		[
			"abstract-property",
			"abstract-accessor-property",
			"abstract-function-property",
			"readonly-property",
			"readonly-function-property",
			"override-readonly-property",
			"override-readonly-function-property",
		],
		// public override title = "";
		// public override accessor visible = true;
		// public override onHover = () => {};
		["override-property", "override-accessor-property", "override-function-property"],
		// public title = "";
		// public accessor visible = true;
		// public onHover = () => {};
		["property", "accessor-property", "function-property"],
		// protected abstract kind: string;
		// protected abstract accessor mode: string;
		// protected abstract onChange: () => void;
		// protected readonly createdAt = Date.now();
		// protected readonly onReady = () => {};
		// protected override readonly createdAt = Date.now();
		[
			"protected-abstract-property",
			"protected-abstract-accessor-property",
			"protected-abstract-function-property",
			"protected-readonly-property",
			"protected-readonly-function-property",
			"protected-override-readonly-property",
			"protected-override-readonly-function-property",
		],
		// protected override status = "idle";
		// protected override accessor busy = false;
		// protected override handle = () => {};
		[
			"protected-override-property",
			"protected-override-accessor-property",
			"protected-override-function-property",
		],
		// protected status = "idle";
		// protected accessor busy = false;
		// protected handle = () => {};
		["protected-property", "protected-accessor-property", "protected-function-property"],
		// readonly #cache = new Map();
		// readonly #log = () => {};
		["private-readonly-property", "private-readonly-function-property"],
		// #retries = 0;
		// accessor #ready = false;
		// #tick = () => {};
		["private-property", "private-accessor-property", "private-function-property"],
		// public constructor() {}
		"constructor",
		// public abstract get value(): number;
		// public abstract set value(next: number);
		["abstract-get-method", "abstract-set-method"],
		// public override get size() {}
		// public override set size(next) {}
		["override-get-method", "override-set-method"],
		// public get size() {}
		// public set size(next) {}
		["get-method", "set-method"],
		// protected abstract get internal(): string;
		["protected-abstract-get-method", "protected-abstract-set-method"],
		// protected override get age() {}
		["protected-override-get-method", "protected-override-set-method"],
		// protected get age() {}
		["protected-get-method", "protected-set-method"],
		// get #isReady() {}
		["private-get-method", "private-set-method"],
		// public abstract render(): string;
		"abstract-method",
		// protected abstract validate(): boolean;
		"protected-abstract-method",
		// public override refresh() {}
		"override-method",
		// public refresh() {}
		"method",
		// protected override reportStatus() {}
		"protected-override-method",
		// protected reportStatus() {}
		"protected-method",
		// #flush() {}
		"private-method",
		// anything not matched above
		"unknown",
	],
};
