import type { MerchantSeed } from '../types';
import { necessities } from '../types';

type AutoFinanceSeed = Pick<
    MerchantSeed,
    'key' | 'name' | 'matchValue' | 'aliases' | 'logoDomain'
> & {
    website: string;
    /** False = goal name only (no monthly invoice). Defaults to a lease/loan payee. */
    payee?: boolean;
};

/**
 * Who invoices a lease or loan.
 * European marques first, in NL market order. Not fuel, insurance, or road tax.
 */
const AUTO_FINANCE: readonly AutoFinanceSeed[] = [
    {
        key: 'VOLKSWAGEN',
        name: 'Volkswagen',
        matchValue: 'Volkswagen',
        aliases: ['Volkswagen', 'Volkswagen Financial Services', 'VWFS', 'Pon Financial'],
        logoDomain: 'volkswagen.nl',
        website: 'https://volkswagen.nl',
    },
    {
        key: 'AUDI',
        name: 'Audi',
        matchValue: 'Audi',
        aliases: ['Audi', 'Audi Financial Services'],
        logoDomain: 'audi.nl',
        website: 'https://audi.nl',
    },
    {
        key: 'SKODA',
        name: 'Škoda',
        matchValue: 'Skoda',
        aliases: ['Škoda', 'Skoda', 'SKODA'],
        logoDomain: 'skoda.nl',
        website: 'https://skoda.nl',
    },
    {
        key: 'SEAT',
        name: 'SEAT',
        matchValue: 'SEAT',
        aliases: ['SEAT', 'Seat'],
        logoDomain: 'seat.nl',
        website: 'https://seat.nl',
    },
    {
        key: 'CUPRA',
        name: 'Cupra',
        matchValue: 'Cupra',
        aliases: ['Cupra', 'CUPRA'],
        logoDomain: 'cupra.com',
        website: 'https://cupra.com',
    },
    {
        key: 'OPEL',
        name: 'Opel',
        matchValue: 'Opel',
        aliases: ['Opel', 'OPEL', 'Opel Financial Services'],
        logoDomain: 'opel.nl',
        website: 'https://opel.nl',
    },
    {
        key: 'PEUGEOT',
        name: 'Peugeot',
        matchValue: 'Peugeot',
        aliases: ['Peugeot', 'PEUGEOT'],
        logoDomain: 'peugeot.nl',
        website: 'https://peugeot.nl',
    },
    {
        key: 'CITROEN',
        name: 'Citroën',
        matchValue: 'Citroen',
        aliases: ['Citroën', 'Citroen', 'CITROEN'],
        logoDomain: 'citroen.nl',
        website: 'https://citroen.nl',
    },
    {
        key: 'RENAULT',
        name: 'Renault',
        matchValue: 'Renault',
        aliases: ['Renault', 'RENAULT', 'Mobilize Financial Services'],
        logoDomain: 'renault.nl',
        website: 'https://renault.nl',
    },
    {
        key: 'DACIA',
        name: 'Dacia',
        matchValue: 'Dacia',
        aliases: ['Dacia', 'DACIA'],
        logoDomain: 'dacia.nl',
        website: 'https://dacia.nl',
    },
    {
        key: 'FIAT',
        name: 'Fiat',
        matchValue: 'Fiat',
        aliases: ['Fiat', 'FIAT'],
        logoDomain: 'fiat.nl',
        website: 'https://fiat.nl',
    },
    {
        key: 'ALFA_ROMEO',
        name: 'Alfa Romeo',
        matchValue: 'Alfa Romeo',
        aliases: ['Alfa Romeo', 'ALFA ROMEO'],
        logoDomain: 'alfaromeo.nl',
        website: 'https://alfaromeo.nl',
    },
    {
        key: 'BMW',
        name: 'BMW',
        matchValue: 'BMW',
        aliases: ['BMW', 'BMW Financial Services', 'BMW Bank'],
        logoDomain: 'bmw.nl',
        website: 'https://bmw.nl',
    },
    {
        key: 'MINI',
        name: 'MINI',
        matchValue: 'MINI ',
        aliases: ['MINI ', 'MINI Cooper', 'MINI Financial Services'],
        logoDomain: 'mini.nl',
        website: 'https://mini.nl',
    },
    {
        key: 'MERCEDES_BENZ',
        name: 'Mercedes-Benz',
        matchValue: 'Mercedes-Benz',
        aliases: ['Mercedes-Benz', 'Mercedes', 'Mercedes-Benz Financial Services'],
        logoDomain: 'mercedes-benz.nl',
        website: 'https://mercedes-benz.nl',
    },
    {
        key: 'SMART',
        name: 'Smart',
        matchValue: 'Smart ',
        aliases: ['Smart ', 'Smart Automobile', 'Smart Europe'],
        logoDomain: 'smart.com',
        website: 'https://smart.com',
    },
    {
        key: 'VOLVO',
        name: 'Volvo',
        matchValue: 'Volvo',
        aliases: ['Volvo', 'Volvo Car Financial Services'],
        logoDomain: 'volvocars.com',
        website: 'https://volvocars.com',
    },
    {
        key: 'POLESTAR',
        name: 'Polestar',
        matchValue: 'Polestar',
        aliases: ['Polestar', 'POLESTAR'],
        logoDomain: 'polestar.com',
        website: 'https://polestar.com',
    },
    {
        key: 'PORSCHE',
        name: 'Porsche',
        matchValue: 'Porsche',
        aliases: ['Porsche', 'Porsche Financial Services'],
        logoDomain: 'porsche.com',
        website: 'https://porsche.com',
    },
    {
        key: 'LAND_ROVER',
        name: 'Land Rover',
        matchValue: 'Land Rover',
        aliases: ['Land Rover', 'LAND ROVER', 'Range Rover', 'RANGE ROVER'],
        logoDomain: 'landrover.nl',
        website: 'https://landrover.nl',
    },
    {
        key: 'JAGUAR',
        name: 'Jaguar',
        matchValue: 'Jaguar',
        aliases: ['Jaguar', 'JAGUAR'],
        logoDomain: 'jaguar.nl',
        website: 'https://jaguar.nl',
    },
    {
        key: 'FERRARI',
        name: 'Ferrari',
        matchValue: 'Ferrari',
        aliases: ['Ferrari', 'Ferrari Financial Services'],
        logoDomain: 'ferrari.com',
        website: 'https://ferrari.com',
    },
    {
        key: 'BUGATTI',
        name: 'Bugatti',
        matchValue: 'Bugatti',
        aliases: ['Bugatti'],
        logoDomain: 'bugatti.com',
        website: 'https://bugatti.com',
        payee: false,
    },
    {
        key: 'LAMBORGHINI',
        name: 'Lamborghini',
        matchValue: 'Lamborghini',
        aliases: ['Lamborghini', 'Lamborghini Financial Services'],
        logoDomain: 'lamborghini.com',
        website: 'https://lamborghini.com',
    },
    {
        key: 'MASERATI',
        name: 'Maserati',
        matchValue: 'Maserati',
        aliases: ['Maserati', 'Maserati Financial Services'],
        logoDomain: 'maserati.com',
        website: 'https://maserati.com',
    },
    {
        key: 'BENTLEY',
        name: 'Bentley',
        matchValue: 'Bentley',
        aliases: ['Bentley', 'Bentley Financial Services'],
        logoDomain: 'bentleymotors.com',
        website: 'https://bentleymotors.com',
    },
    {
        key: 'ROLLS_ROYCE',
        name: 'Rolls-Royce',
        matchValue: 'Rolls-Royce',
        aliases: ['Rolls-Royce', 'Rolls Royce'],
        logoDomain: 'rolls-roycemotorcars.com',
        website: 'https://rolls-roycemotorcars.com',
    },
    {
        key: 'ASTON_MARTIN',
        name: 'Aston Martin',
        matchValue: 'Aston Martin',
        aliases: ['Aston Martin', 'Aston Martin Financial Services'],
        logoDomain: 'astonmartin.com',
        website: 'https://astonmartin.com',
    },
    {
        key: 'MCLAREN',
        name: 'McLaren',
        matchValue: 'McLaren',
        aliases: ['McLaren', 'McLaren Automotive'],
        logoDomain: 'mclaren.com',
        website: 'https://mclaren.com',
    },
    {
        key: 'TESLA',
        name: 'Tesla',
        matchValue: 'Tesla',
        aliases: ['Tesla', 'TESLA', 'Tesla Financial', 'Tesla Lease'],
        logoDomain: 'tesla.com',
        website: 'https://tesla.com',
    },
    {
        key: 'TOYOTA',
        name: 'Toyota',
        matchValue: 'Toyota',
        aliases: ['Toyota', 'Toyota Financial Services', 'Toyota Lease'],
        logoDomain: 'toyota.nl',
        website: 'https://toyota.nl',
    },
    {
        key: 'KIA',
        name: 'Kia',
        matchValue: 'Kia',
        aliases: ['Kia', 'KIA', 'Kia Finance', 'Kia Lease'],
        logoDomain: 'kia.nl',
        website: 'https://kia.nl',
    },
    {
        key: 'HYUNDAI',
        name: 'Hyundai',
        matchValue: 'Hyundai',
        aliases: ['Hyundai', 'HYUNDAI', 'Hyundai Finance', 'Hyundai Lease'],
        logoDomain: 'hyundai.nl',
        website: 'https://hyundai.nl',
    },
];

/** Chip order for car lease and car loan. Goal-only marques stay off this list. */
export const AUTO_FINANCE_KEYS: readonly string[] = AUTO_FINANCE.filter(
    row => row.payee !== false
).map(row => row.key);

export const AUTO_FINANCE_MERCHANTS: readonly MerchantSeed[] = AUTO_FINANCE.map(
    ({ payee: _payee, ...row }) => ({
        ...row,
        mcc: '7512',
        jarKey: necessities,
        categoryTemplateKey: 'TRANSPORT',
        highlight: null,
        markets: ['NL'],
        matchPriority: 0,
        isActive: true,
    })
);
