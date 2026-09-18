import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { BookService } from './book.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('growth/learn/books', 'public')
export class BookController {
    constructor(@Inject(BookService) private readonly books: BookService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Save a book the household found in the public catalog. */
    @Implement(contract.growth.learn.createBook)
    create() {
        return implement(contract.growth.learn.createBook).handler(({ input }) =>
            this.books.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Search the public book catalog. Nothing is stored until they pick one. */
    @Implement(contract.growth.learn.searchBooks)
    search() {
        return implement(contract.growth.learn.searchBooks).handler(({ input }) =>
            this.books.search(input.query)
        );
    }

    /** Books this household added. */
    @Implement(contract.growth.learn.listBooks)
    list() {
        return implement(contract.growth.learn.listBooks).handler(() => this.books.list());
    }
}
