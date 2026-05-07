import { Component, signal, computed } from '@angular/core';
import {form, required} from '@angular/forms/signals';
import { MatFormField } from '@angular/material/input';

@Component({
	selector: 'app-search-ingredient',
	standalone: true,
	templateUrl: './search-ingredient.html',
	imports: [
		MatFormField
	]
})
export class SearchDropdownComponent {
	private static DEFAULT_FORM:formModel = {name:'', amount:0, measurement:''}
	private formModel = signal(SearchDropdownComponent.DEFAULT_FORM);
	protected readonly form = form(this.formModel, path =>{
		required(path.name, {message:'Name of ingredient required'});
	})

	protected options = signal<string[]>([
		'smth 12',
		'smth abc',
		'another option',
		'something else',
		'sex',
		'2 sexes',
		'penis'
	]);
	protected query = signal('');
	protected isOpen = signal(false);
	filteredOptions = computed(() => {
		const q = this.query().toLowerCase();
		return this.options().filter(opt =>
			opt.toLowerCase().includes(q)
		);
	});

	onInput(value: string) {
		this.updateList()
		this.query.set(value);
		this.isOpen.set(true);
	}

	selectOption(option: string) {
		this.query.set(option);
		this.isOpen.set(false);
	}

	updateList(){
		//
	}
}

type formModel = {
	name: string,
	amount: number,
	measurement: string
}
