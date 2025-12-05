using { 
	Application.Application as App
} from '../db/Application.cds';

@segw.name: 'ZAPP'
service ApplicationService {
	entity Applications as projection on App;
};