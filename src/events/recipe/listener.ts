import { Request } from "express"

import {IRecipe, Recipe} from "@models/recipe"

import redis from "@redis"
import {HistoryService} from "@services/history.service";
import {IReview} from "@models/review";
import {channel, pubsub} from "@graphql/pubsub";

const view = async (recipe: IRecipe, { user, clientIp }: Request) => {
    if(!clientIp) {
        // dừng nếu không tìm thấy ip request
        return
    }
    const key: string = 'view-recipe-' + clientIp

    // kiểm xem có trong redis hay chưa
    // nếu có tồn tại trong redis thì dừng
    // data trong redis sẽ tự mất trong 1 phút
    const _check = await redis.get(key)
    if(_check) {
        return
    }
    // hêt hạn 60s
    await redis.set(key, '1', 'EX', 60)
    // tăng view cho Recipe
    const updated = await Recipe.findByIdAndUpdate(recipe._id, { $inc: { views: 1 } }, { returnOriginal: false })

    await pubsub.publish(channel.RECIPE, { subRecipe: updated })

    if(user){
        // gi lịch sử user
        const history = new HistoryService(user!)
        await history.add(recipe)
    }
}

const rate = async (recipe: IRecipe, review: IReview) => {
    await Recipe.findByIdAndUpdate(recipe._id, {
        $inc: {
            countRating: 1,
            totalRating: review.totalRating
        }
    })
}

const bookmark = async (recipe: IRecipe, bookmatked: boolean) => {
    if (bookmatked) {
        // đã bookmark => huỷ => giảm
        const updated = await Recipe.findByIdAndUpdate(recipe._id, { $inc: {  } })
    }
}

export default {
    view,
    rate
}
