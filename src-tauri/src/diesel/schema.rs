diesel::table! {
    documents (id) {
        id -> Text,
        filename -> Text,
        url -> Text,
        doctype -> Text,
        title -> Text,
        authors -> Text,
        #[sql_name = "publicationYear"]
        publication_year -> Nullable<Integer>,
        publisher -> Nullable<Text>,
        category -> Text,
        language -> Text,
        keywords -> Text,
        #[sql_name = "abstract"]
        abstract_field -> Text,
        favorite -> Integer,
        metadata -> Nullable<Text>,
        hash -> Text,
        #[sql_name = "createdAt"]
        created_at -> Timestamp,
        #[sql_name = "updatedAt"]
        updated_at -> Timestamp,
        #[sql_name = "numPages"]
        num_pages -> Integer,
        filesize -> BigInt,
        format -> Text,
        cover -> Nullable<Binary>,
    }
}
