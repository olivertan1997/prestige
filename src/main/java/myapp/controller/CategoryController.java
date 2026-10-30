package myapp.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import myapp.entity.CategoryRepository;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*") // Prevents web security blocks when testing locally
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    // GET /api/categories  ->  active categories, for the "category" drop-down when
    // adding or editing a project on manage-projects.html
    @GetMapping
    public List<CategoryItem> listCategories() {
        return categoryRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(c -> new CategoryItem(c.getId(), c.getName()))
                .toList();
    }
}
